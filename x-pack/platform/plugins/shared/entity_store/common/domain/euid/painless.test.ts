/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../definitions/entity_schema';
import { getBuiltInEntityDefinition } from '../definitions/registry';
import { hostEntityDefinition } from '../definitions/host';
import { USER_ENTITY_NAMESPACE } from '../definitions/user_entity_constants';
import {
  createSourceExpressions,
  getEuidPainlessEvaluation,
  getEuidPainlessEvaluationForSearch,
  getEuidPainlessRuntimeMapping,
  getEuidPainlessSourceUpdateScript,
  conditionToPainless,
} from './painless';

describe('conditionToPainless', () => {
  const nonEmpty = (field: string) =>
    `doc.containsKey('${field}') && doc['${field}'].size() > 0 && doc['${field}'].value != null && doc['${field}'].value != ""`;

  it('returns "false" when condition is null or undefined', () => {
    expect(conditionToPainless(null)).toBe('false');
    expect(conditionToPainless(undefined)).toBe('false');
  });

  it('returns "false" when condition is not an object', () => {
    expect(conditionToPainless('string')).toBe('false');
    expect(conditionToPainless(42)).toBe('false');
  });

  it('returns "true" for always', () => {
    expect(conditionToPainless({ always: true })).toBe('true');
  });

  it('returns "false" for never', () => {
    expect(conditionToPainless({ never: true })).toBe('false');
  });

  it('translates field eq predicate', () => {
    const condition = { field: 'event.kind', eq: 'asset' };
    expect(conditionToPainless(condition)).toBe(
      `(${nonEmpty('event.kind')} && doc['event.kind'].value == "asset")`
    );
  });

  it('translates field neq predicate', () => {
    const condition = { field: 'event.outcome', neq: 'failure' };
    expect(conditionToPainless(condition)).toBe(
      `(!(${nonEmpty('event.outcome')}) || doc['event.outcome'].value != "failure")`
    );
  });

  it('translates field exists true', () => {
    const condition = { field: 'user.email', exists: true };
    expect(conditionToPainless(condition)).toBe(nonEmpty('user.email'));
  });

  it('translates field exists false', () => {
    const condition = { field: 'event.kind', exists: false };
    expect(conditionToPainless(condition)).toBe(`!(${nonEmpty('event.kind')})`);
  });

  it('translates field includes predicate', () => {
    const condition = { field: 'event.kind', includes: 'asset' };
    expect(conditionToPainless(condition)).toBe(
      `(${nonEmpty('event.kind')} && doc['event.kind'].value.contains("asset"))`
    );
  });

  it('translates and condition', () => {
    const condition = {
      and: [
        { field: 'user.name', exists: true },
        { field: 'host.id', exists: true },
      ],
    };
    expect(conditionToPainless(condition)).toBe(
      `(${nonEmpty('user.name')} && ${nonEmpty('host.id')})`
    );
  });

  it('translates or condition', () => {
    const condition = {
      or: [
        { field: 'event.kind', includes: 'asset' },
        { field: 'entity.id', exists: true },
      ],
    };
    expect(conditionToPainless(condition)).toBe(
      `((${nonEmpty('event.kind')} && doc['event.kind'].value.contains("asset")) || ${nonEmpty(
        'entity.id'
      )})`
    );
  });

  it('translates not condition', () => {
    const condition = { not: { field: 'event.outcome', eq: 'failure' } };
    const inner = `(${nonEmpty('event.outcome')} && doc['event.outcome'].value == "failure")`;
    expect(conditionToPainless(condition)).toBe(`!(${inner})`);
  });

  it('translates empty and as true', () => {
    expect(conditionToPainless({ and: [] })).toBe('true');
  });

  it('translates empty or as false', () => {
    expect(conditionToPainless({ or: [] })).toBe('false');
  });

  it('translates nested and/or/not', () => {
    const condition = {
      or: [
        { field: 'entity.id', exists: true },
        {
          and: [
            { field: 'event.category', includes: 'iam' },
            {
              or: [
                { field: 'event.type', includes: 'user' },
                { field: 'event.type', includes: 'creation' },
              ],
            },
          ],
        },
      ],
    };
    const result = conditionToPainless(condition);
    expect(result).toContain(nonEmpty('entity.id'));
    expect(result).toContain(nonEmpty('event.category'));
    expect(result).toContain('doc[\'event.category\'].value.contains("iam")');
    expect(result).toContain('doc[\'event.type\'].value.contains("user")');
    expect(result).toContain('doc[\'event.type\'].value.contains("creation")');
    expect(result).toContain(' && ');
    expect(result).toContain(' || ');
  });

  it('escapes special characters in field names', () => {
    const condition = { field: "user.name'", eq: 'x' };
    expect(conditionToPainless(condition)).toContain("\\'");
  });

  it('escapes special characters in string values', () => {
    const condition = { field: 'a', eq: 'value with "quotes"' };
    expect(conditionToPainless(condition)).toContain('\\"');
  });

  it('returns "false" for unknown condition shape', () => {
    expect(conditionToPainless({ field: 'a' })).toBe('false');
  });

  const userEvaluatedVars = new Map<string, string>([['entity.namespace', 'entity_namespace']]);

  it('should use evaluated var for eq when field is in evaluatedVars', () => {
    expect(
      conditionToPainless(
        { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(`entity_namespace != null && entity_namespace == "${USER_ENTITY_NAMESPACE.Local}"`);
  });

  it('should use doc access for eq when field is not in evaluatedVars', () => {
    expect(
      conditionToPainless({ field: 'user.name', eq: 'alice' }, { evaluatedVars: userEvaluatedVars })
    ).toBe(`(${nonEmpty('user.name')} && doc['user.name'].value == "alice")`);
  });

  it('should mix evaluated var and doc fields in and conditions', () => {
    const result = conditionToPainless(
      {
        and: [
          { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
          { field: 'user.name', eq: 'x' },
        ],
      },
      { evaluatedVars: userEvaluatedVars }
    );
    expect(result).toBe(
      `(entity_namespace != null && entity_namespace == "${
        USER_ENTITY_NAMESPACE.Local
      }" && (${nonEmpty('user.name')} && doc['user.name'].value == "x"))`
    );
  });

  it('should use evaluated var for neq', () => {
    expect(
      conditionToPainless(
        { field: 'entity.namespace', neq: USER_ENTITY_NAMESPACE.Local },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(
      `(entity_namespace == null || entity_namespace == "" || entity_namespace != "${USER_ENTITY_NAMESPACE.Local}")`
    );
  });

  it('should use evaluated var for exists true and false', () => {
    expect(
      conditionToPainless(
        { field: 'entity.namespace', exists: true },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe('entity_namespace != null && entity_namespace != ""');
    expect(
      conditionToPainless(
        { field: 'entity.namespace', exists: false },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe('(entity_namespace == null || entity_namespace == "")');
  });

  it('should use evaluated var for includes', () => {
    expect(
      conditionToPainless(
        { field: 'entity.namespace', includes: 'okta' },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(
      'entity_namespace != null && entity_namespace != "" && entity_namespace.contains("okta")'
    );
  });
});

describe('getEuidPainlessEvaluation', () => {
  describe('snapshots per entity type', () => {
    Object.values(EntityType.enum).forEach((entityType) => {
      it(`generates the expected Painless script for ${entityType}`, () => {
        const script = getEuidPainlessEvaluation(getBuiltInEntityDefinition(entityType));
        expect(script).toMatchSnapshot();
      });
    });
  });

  it('does not include shared field evaluations in host EUID generation', () => {
    const script = getEuidPainlessEvaluation(getBuiltInEntityDefinition(EntityType.enum.host));

    expect(script).not.toContain('entity_source');
  });
});

describe('getEuidPainlessRuntimeMapping', () => {
  Object.values(EntityType.enum).forEach((entityType) => {
    it(`returns a keyword runtime mapping that wraps getEuidPainlessEvaluation for ${entityType}`, () => {
      const returnScript = getEuidPainlessEvaluation(getBuiltInEntityDefinition(entityType));
      const mapping = getEuidPainlessRuntimeMapping(getBuiltInEntityDefinition(entityType));

      expect(mapping.type).toBe('keyword');
      expect(mapping.script).toBeDefined();
      expect(mapping.script.source).toContain('if (___euid != null) { emit(___euid); }');
      expect(mapping.script.source).toContain('String ___euid_rt_eval(def doc)');
      expect(mapping.script.source).toContain('___euid_rt_eval(doc)');
      const firstReturn = returnScript.indexOf('return');
      expect(firstReturn).toBeGreaterThan(-1);
      expect(mapping.script.source).toContain(returnScript.slice(0, firstReturn));
    });
  });

  it('threads applyPostAggFilter through to the evaluation', () => {
    const mapping = getEuidPainlessRuntimeMapping(
      getBuiltInEntityDefinition(EntityType.enum.user),
      {
        applyPostAggFilter: false,
      }
    );

    expect(mapping.script.source).toContain(
      getEuidPainlessEvaluation(getBuiltInEntityDefinition(EntityType.enum.user), {
        applyPostAggFilter: false,
      })
    );
  });
});

describe('getEuidPainlessEvaluation postAggFilter gate', () => {
  // Unique to postAggFilter. `event.kind` is no good as a marker: the cloud-provider clause uses it too.
  const postAggOnlyMarker = `doc.containsKey('entity.id')`;

  it('gates on postAggFilter by default', () => {
    const script = getEuidPainlessEvaluation(getBuiltInEntityDefinition(EntityType.enum.user));

    expect(script).toContain(postAggOnlyMarker);
  });

  it('omits the postAggFilter gate in the search variant', () => {
    const script = getEuidPainlessEvaluationForSearch(
      getBuiltInEntityDefinition(EntityType.enum.user)
    );

    expect(script).not.toContain(postAggOnlyMarker);
  });

  it('keeps the documentsFilter gate in the search variant', () => {
    const script = getEuidPainlessEvaluationForSearch(
      getBuiltInEntityDefinition(EntityType.enum.user)
    );

    // documentsFilter requires event.outcome != failure and at least one user identifier.
    expect(script).toContain(`doc.containsKey('event.outcome')`);
    expect(script).toContain(`doc.containsKey('user.name')`);
  });

  it('lets a detection alert satisfy the gate', () => {
    const script = getEuidPainlessEvaluation(getBuiltInEntityDefinition(EntityType.enum.user));

    // ORed in front, so Painless short-circuits and skips the whole clause for alerts.
    expect(script).toContain(`doc.containsKey('kibana.alert.rule.uuid')`);
    const markerAt = script.indexOf(`doc.containsKey('kibana.alert.rule.uuid')`);
    const postAggAt = script.indexOf(postAggOnlyMarker);
    expect(markerAt).toBeGreaterThan(-1);
    expect(markerAt).toBeLessThan(postAggAt);
  });

  it('omits the alert waiver in the search variant', () => {
    const script = getEuidPainlessEvaluationForSearch(
      getBuiltInEntityDefinition(EntityType.enum.user)
    );

    expect(script).not.toContain(`doc.containsKey('kibana.alert.rule.uuid')`);
  });

  it('does not waive anything for a definition with no postAggFilter', () => {
    // host has documentsFilter only, so there is nothing to waive.
    const script = getEuidPainlessEvaluation(getBuiltInEntityDefinition(EntityType.enum.host));

    expect(script).not.toContain(`doc.containsKey('kibana.alert.rule.uuid')`);
  });
});

/**
 * Anything reading doc-values, which an update context has no access to. The generated script is
 * only ever checked by Elasticsearch at compile time, so a `expressions` argument missed at one
 * call site would otherwise surface as a runtime `script_exception` rather than a failing test.
 */
const DOC_VALUES_READS = /doc\[|doc\.containsKey/;

describe('createSourceExpressions', () => {
  const expressions = createSourceExpressions('params._source');

  it('reads a field by its flattened key and its path segments', () => {
    // `_source` is unflattened, so both shapes have to be tried; the segments are split here
    // rather than in Painless, where regex is disabled by default.
    expect(expressions.value('host.id')).toBe("__euid_src(__euid_root,'host.id',['host','id'])");
  });

  it('addresses the source by the root it was given', () => {
    expect(expressions.rootBinding).toEqual({
      param: '__euid_root',
      expression: 'params._source',
    });
    expect(createSourceExpressions('ctx._source').rootBinding.expression).toBe('ctx._source');
  });

  it('treats presence and non-emptiness alike', () => {
    // The reader already returns null for an empty string, so the distinction doc-values needs
    // collapses here.
    expect(expressions.isPresent('host.id')).toBe(expressions.isNotEmpty('host.id'));
  });
});

describe('getEuidPainlessSourceUpdateScript', () => {
  const ALL_TYPES = Object.values(EntityType.enum);
  const ALL_DEFINITIONS = ALL_TYPES.map((entityType) => getBuiltInEntityDefinition(entityType));
  const onEuids = "ctx._source['some.field'] = euids;";

  it('never falls back to doc-values', () => {
    // The invariant the whole update-context path rests on: `doc` is not bound there.
    expect(getEuidPainlessSourceUpdateScript(ALL_DEFINITIONS, onEuids)).not.toMatch(
      DOC_VALUES_READS
    );
  });

  it('defines the source reader once, however many entity types', () => {
    const script = getEuidPainlessSourceUpdateScript(ALL_DEFINITIONS, onEuids);

    // Painless rejects a duplicate function definition, so this is a compile error, not waste.
    expect(script.split('def __euid_src(').length - 1).toBe(1);
  });

  it('evaluates every entity type it is given, in one script', () => {
    // One script rather than one per type, so a document is rewritten once.
    const script = getEuidPainlessSourceUpdateScript(ALL_DEFINITIONS, onEuids);

    for (const entityType of ALL_TYPES) {
      expect(script).toContain(`String __euid_eval_${entityType}(def __euid_root)`);
      expect(script).toContain(`__euid = __euid_eval_${entityType}(ctx._source);`);
    }
  });

  it('leaves the document untouched when no entity type resolves', () => {
    // `ctx.op = 'noop'` rather than writing an empty value: no version bump, no merge cost.
    const script = getEuidPainlessSourceUpdateScript(ALL_DEFINITIONS, onEuids);

    expect(script).toContain("if (euids.isEmpty()) { ctx.op = 'noop'; }");
    expect(script).toContain(`else { ${onEuids} }`);
  });

  it('skips the creation gate, as the search variant does', () => {
    // Stamping answers which entity a document refers to, not whether it may create one.
    const script = getEuidPainlessSourceUpdateScript(
      [getBuiltInEntityDefinition(EntityType.enum.user)],
      onEuids
    );

    expect(script).not.toContain('kibana.alert.rule.uuid');
  });

  it('generates the expected script', () => {
    // `generic` has a single-field identity, so the snapshot stays readable.
    expect(
      getEuidPainlessSourceUpdateScript(
        [getBuiltInEntityDefinition(EntityType.enum.generic)],
        onEuids
      )
    ).toMatchSnapshot();
  });
});

describe('getEuidPainlessRuntimeMapping with source expressions', () => {
  const mapping = getEuidPainlessRuntimeMapping(getBuiltInEntityDefinition(EntityType.enum.host), {
    expressions: createSourceExpressions('params._source'),
  });

  it('never falls back to doc-values', () => {
    expect(mapping.script.source).not.toMatch(DOC_VALUES_READS);
  });

  it('declares the source root as a parameter and passes it in', () => {
    // A Painless function sees only its own parameters, so the root cannot be referenced directly
    // from inside the wrapper.
    expect(mapping.script.source).toContain('String ___euid_rt_eval(def __euid_root)');
    expect(mapping.script.source).toContain('___euid_rt_eval(params._source)');
  });

  it('places the source reader at the script root, ahead of the wrapper', () => {
    // Painless has no nested function definitions.
    const { source } = mapping.script;

    expect(source.indexOf('def __euid_src(')).toBe(0);
    expect(source.indexOf('def __euid_src(')).toBeLessThan(
      source.indexOf('String ___euid_rt_eval')
    );
  });
});

describe('type prefix validation', () => {
  const badDefinition = { ...hostEntityDefinition, type: 'a"b' };

  it('throws when the type name cannot be emitted as a prefix', () => {
    expect(() => getEuidPainlessEvaluation(badDefinition)).toThrow(
      'Cannot emit the entity type prefix'
    );
  });

  it('does not throw when the type prefix is skipped', () => {
    const definition = {
      ...badDefinition,
      identityField: { ...badDefinition.identityField, skipTypePrepend: true },
    };
    expect(() => getEuidPainlessEvaluation(definition)).not.toThrow();
  });
});
