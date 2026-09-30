/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  type BuilderFieldsManifest,
} from '@kbn/alerting-v2-rule-builders';
import { detectionRuleBuilderFieldsManifest } from '@kbn/security-detection-rule-builder-fields';
import {
  assertBuilderFieldsManifests,
  assertFoldCompleteness,
} from './assert_builder_fields_manifests';
import { FoldedVersionsSet } from '../lib/builder_types/folded_versions';

// ---------------------------------------------------------------------------
// Fixtures — minimal well-formed manifests to build failure cases from.
// ---------------------------------------------------------------------------

/** A manifest that passes all four checks. */
const validManifest: BuilderFieldsManifest = {
  builderTypes: ['test.type.a'],
  currentVersion: 1,
  currentMappings: {
    risk_score: { type: 'integer' },
    severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    note: { type: 'text' },
  },
  versions: {
    1: {
      addedMappings: {
        risk_score: { type: 'integer' },
        severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        note: { type: 'text' },
      },
    },
  },
};

/** A second valid manifest with disjoint paths. */
const validManifestB: BuilderFieldsManifest = {
  builderTypes: ['test.type.b'],
  currentVersion: 1,
  currentMappings: {
    max_signals: { type: 'integer' },
  },
  versions: {
    1: {
      addedMappings: {
        max_signals: { type: 'integer' },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Production manifest smoke test
// ---------------------------------------------------------------------------

describe('assertBuilderFieldsManifests — production manifest', () => {
  it('the production detectionRuleBuilderFieldsManifest passes all four checks', () => {
    expect(() => assertBuilderFieldsManifests([detectionRuleBuilderFieldsManifest])).not.toThrow();
  });

  it('the production manifest passes when combined with a second valid manifest', () => {
    expect(() =>
      assertBuilderFieldsManifests([detectionRuleBuilderFieldsManifest, validManifestB])
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Keyword ceiling
// ---------------------------------------------------------------------------

describe('assertBuilderFieldsManifests — keyword ceiling', () => {
  it('passes for a keyword sub-field at exactly KEYWORD_SUB_FIELD_IGNORE_ABOVE', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.ceiling.ok'],
      currentVersion: 1,
      currentMappings: {
        field_a: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      versions: {
        1: {
          addedMappings: {
            field_a: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).not.toThrow();
  });

  it('throws for a keyword sub-field one above KEYWORD_SUB_FIELD_IGNORE_ABOVE', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.ceiling.bad'],
      currentVersion: 1,
      currentMappings: {
        field_a: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE + 1 },
      },
      versions: {
        1: {
          addedMappings: {
            field_a: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE + 1 },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('field_a'),
      })
    );
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('ceiling'),
      })
    );
  });

  it('throws and the error names the offending path and the ceiling value', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.ceiling.error-message'],
      currentVersion: 1,
      currentMappings: {
        bad_field: { type: 'keyword', ignore_above: 99999 },
      },
      versions: {
        1: {
          addedMappings: {
            bad_field: { type: 'keyword', ignore_above: 99999 },
          },
        },
      },
    };
    let message = '';
    try {
      assertBuilderFieldsManifests([manifest]);
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain('"bad_field"');
    expect(message).toContain(String(KEYWORD_SUB_FIELD_IGNORE_ABOVE));
  });

  it('passes for non-keyword sub-fields with no ignore_above', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.ceiling.text'],
      currentVersion: 1,
      currentMappings: {
        body: { type: 'text' },
        count: { type: 'integer' },
        active: { type: 'boolean' },
      },
      versions: {
        1: {
          addedMappings: {
            body: { type: 'text' },
            count: { type: 'integer' },
            active: { type: 'boolean' },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Mapping equality
// ---------------------------------------------------------------------------

describe('assertBuilderFieldsManifests — mapping equality', () => {
  it('passes when currentMappings and versions describe exactly the same leaves', () => {
    expect(() => assertBuilderFieldsManifests([validManifest])).not.toThrow();
  });

  it('throws when a leaf is in the version history but not in currentMappings', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.eq.history-extra'],
      currentVersion: 1,
      currentMappings: {
        // risk_score is missing — it is in the version but not in currentMappings.
        note: { type: 'text' },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'integer' },
            note: { type: 'text' },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('risk_score'),
      })
    );
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('history'),
      })
    );
  });

  it('throws when a leaf is in currentMappings but in no version', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.eq.current-extra'],
      currentVersion: 1,
      currentMappings: {
        risk_score: { type: 'integer' },
        note: { type: 'text' },
        // orphan is in currentMappings but not in any version.
        orphan: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'integer' },
            note: { type: 'text' },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('orphan'),
      })
    );
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('currentMappings'),
      })
    );
  });

  it('throws when a shared path has different declarations in history vs currentMappings', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.eq.declaration-mismatch'],
      currentVersion: 1,
      currentMappings: {
        // risk_score is integer in history but keyword here.
        risk_score: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'integer' },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('risk_score'),
      })
    );
  });

  it('passes for a multi-version manifest where all versions together equal currentMappings', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.eq.multi-version'],
      currentVersion: 2,
      currentMappings: {
        risk_score: { type: 'integer' },
        note: { type: 'text' },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'integer' },
          },
        },
        2: {
          addedMappings: {
            note: { type: 'text' },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Manifest shape
// ---------------------------------------------------------------------------

describe('assertBuilderFieldsManifests — manifest shape', () => {
  it('passes for a valid single-version manifest', () => {
    expect(() => assertBuilderFieldsManifests([validManifest])).not.toThrow();
  });

  it('throws when versions are not dense from 1 (gap at 2)', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.shape.gap'],
      currentVersion: 3,
      currentMappings: {
        a: { type: 'integer' },
        b: { type: 'integer' },
      },
      versions: {
        1: { addedMappings: { a: { type: 'integer' } } },
        // version 2 is missing
        3: { addedMappings: { b: { type: 'integer' } } },
      } as Record<number, (typeof manifest)['versions'][number]>,
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('dense from 1'),
      })
    );
  });

  it('throws when currentVersion does not equal the highest key', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.shape.wrong-current'],
      currentVersion: 5, // wrong: highest key is 1
      currentMappings: {
        a: { type: 'integer' },
      },
      versions: {
        1: { addedMappings: { a: { type: 'integer' } } },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('currentVersion'),
      })
    );
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('5'),
      })
    );
  });

  it('throws when a backfill names a builder type outside the manifest builderTypes', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.shape.owner'],
      currentVersion: 1,
      currentMappings: {
        a: { type: 'integer' },
      },
      versions: {
        1: {
          addedMappings: { a: { type: 'integer' } },
          backfills: [
            {
              builderTypes: ['other.type.not.in.manifest'],
              migrate: (fields) => fields,
            },
          ],
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('other.type.not.in.manifest'),
      })
    );
  });

  it('throws when one builder type appears in two backfills of the same version', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.type.x', 'test.type.y'],
      currentVersion: 1,
      currentMappings: {
        a: { type: 'integer' },
      },
      versions: {
        1: {
          addedMappings: { a: { type: 'integer' } },
          backfills: [
            {
              builderTypes: ['test.type.x'],
              migrate: (fields) => fields,
            },
            {
              // test.type.x appears again in the same version
              builderTypes: ['test.type.x', 'test.type.y'],
              migrate: (fields) => fields,
            },
          ],
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('test.type.x'),
      })
    );
    expect(() => assertBuilderFieldsManifests([manifest])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('more than one backfill'),
      })
    );
  });

  it('passes when each builder type appears in exactly one backfill per version', () => {
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.type.x', 'test.type.y'],
      currentVersion: 1,
      currentMappings: {
        a: { type: 'integer' },
      },
      versions: {
        1: {
          addedMappings: { a: { type: 'integer' } },
          backfills: [
            {
              builderTypes: ['test.type.x'],
              migrate: (fields) => fields,
            },
            {
              builderTypes: ['test.type.y'],
              migrate: (fields) => fields,
            },
          ],
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([manifest])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cross-solution leaf conflict
// ---------------------------------------------------------------------------

describe('assertBuilderFieldsManifests — cross-solution leaf conflict', () => {
  it('passes when two manifests declare disjoint leaf paths', () => {
    expect(() => assertBuilderFieldsManifests([validManifest, validManifestB])).not.toThrow();
  });

  it('passes when two manifests declare the same path with identical sub-field types (silent merge)', () => {
    const manifestWithSharedPath: BuilderFieldsManifest = {
      builderTypes: ['test.type.shared'],
      currentVersion: 1,
      currentMappings: {
        // risk_score is also declared by validManifest with the same type — should merge silently.
        risk_score: { type: 'integer' },
        extra: { type: 'text' },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'integer' },
            extra: { type: 'text' },
          },
        },
      },
    };
    expect(() =>
      assertBuilderFieldsManifests([validManifest, manifestWithSharedPath])
    ).not.toThrow();
  });

  it('throws when two manifests declare the same path with different sub-field types', () => {
    const manifestConflict: BuilderFieldsManifest = {
      builderTypes: ['test.type.conflict'],
      currentVersion: 1,
      currentMappings: {
        // risk_score is integer in validManifest but keyword here — conflict.
        risk_score: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
          },
        },
      },
    };
    expect(() => assertBuilderFieldsManifests([validManifest, manifestConflict])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('risk_score'),
      })
    );
  });

  it('the conflict error names both manifests and the conflicting path', () => {
    const manifestConflict: BuilderFieldsManifest = {
      builderTypes: ['test.type.conflict-b'],
      currentVersion: 1,
      currentMappings: {
        risk_score: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      versions: {
        1: {
          addedMappings: {
            risk_score: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
          },
        },
      },
    };
    let message = '';
    try {
      assertBuilderFieldsManifests([validManifest, manifestConflict]);
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain('"risk_score"');
    expect(message).toContain('test.type.a');
    expect(message).toContain('test.type.conflict-b');
  });
});

// ---------------------------------------------------------------------------
// assertFoldCompleteness
// ---------------------------------------------------------------------------

describe('assertFoldCompleteness', () => {
  // A minimal manifest with two versions for fixture construction.
  const twoVersionManifest: BuilderFieldsManifest = {
    builderTypes: ['test.fold.type'],
    currentVersion: 2,
    currentMappings: {
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      risk_score: { type: 'integer' },
    },
    versions: {
      1: {
        addedMappings: {
          severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        },
      },
      2: {
        addedMappings: {
          risk_score: { type: 'integer' },
        },
      },
    },
  };

  it('passes when every version of every manifest is folded', () => {
    const folded = new FoldedVersionsSet();
    folded.recordManifest(twoVersionManifest, 1);
    folded.recordManifest(twoVersionManifest, 2);
    expect(() => assertFoldCompleteness([twoVersionManifest], folded)).not.toThrow();
  });

  it('throws when version 1 of a manifest has no fold line', () => {
    const folded = new FoldedVersionsSet();
    // Version 1 is not recorded; version 2 is.
    folded.recordManifest(twoVersionManifest, 2);
    expect(() => assertFoldCompleteness([twoVersionManifest], folded)).toThrow(
      /version 1.*has no fold line/
    );
  });

  it('throws when version 2 of a manifest has no fold line', () => {
    const folded = new FoldedVersionsSet();
    // Version 1 is recorded; version 2 is not.
    folded.recordManifest(twoVersionManifest, 1);
    expect(() => assertFoldCompleteness([twoVersionManifest], folded)).toThrow(
      /version 2.*has no fold line/
    );
  });

  it('throws when no version of a manifest is folded', () => {
    const folded = new FoldedVersionsSet();
    expect(() => assertFoldCompleteness([twoVersionManifest], folded)).toThrow(/has no fold line/);
  });

  it('error message names the manifest builder types and the missing version', () => {
    const folded = new FoldedVersionsSet();
    folded.recordManifest(twoVersionManifest, 1);
    // Version 2 missing.
    let message = '';
    try {
      assertFoldCompleteness([twoVersionManifest], folded);
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain('test.fold.type');
    expect(message).toContain('version 2');
    expect(message).toContain('rule_model_versions.ts');
  });

  it('passes for an empty manifest list', () => {
    const folded = new FoldedVersionsSet();
    expect(() => assertFoldCompleteness([], folded)).not.toThrow();
  });

  it('the real detection manifest passes when its version 1 is folded', () => {
    const folded = new FoldedVersionsSet();
    folded.recordManifest(detectionRuleBuilderFieldsManifest, 1);
    expect(() =>
      assertFoldCompleteness([detectionRuleBuilderFieldsManifest], folded)
    ).not.toThrow();
  });
});
