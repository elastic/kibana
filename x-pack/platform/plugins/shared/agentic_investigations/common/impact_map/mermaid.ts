/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImpactMapAnnotations,
  ImpactMapEntity,
  ImpactMapEntityType,
  ImpactMapRelationship,
  ImpactMapRelationshipType,
} from './impact_map';

/**
 * Mermaid in, Mermaid out. The impact map can draw anything Mermaid can: nodes, labelled and
 * directed edges, nested subgraphs, shapes and severity styling. This reads a Mermaid diagram into
 * entities and relationships, so a diagram in a runbook or a repo becomes evidence for the map, and
 * writes a map back as Mermaid for Slack, docs and pull requests.
 *
 * Supported: `flowchart`/`graph`, `architecture-beta` and `sequenceDiagram`. Anything else is
 * reported in `warnings` rather than guessed at.
 */

export interface ParsedMermaid {
  diagram: 'flowchart' | 'architecture' | 'sequence' | 'unsupported';
  entities: ImpactMapEntity[];
  relationships: ImpactMapRelationship[];
  warnings: string[];
}

/** Entity types a diagram's words and shapes suggest. The ids are built-in catalog types. */
const KEYWORD_TYPES: Array<[RegExp, string]> = [
  [/availability.?zone|\baz\b|\bzone\b/i, 'cloud.availability_zone'],
  [/\bregion\b/i, 'cloud.region'],
  [/data.?cent(er|re)|\bdc\d*\b/i, 'data_center'],
  [/firewall|security.?group|\bacl\b|network.?polic/i, 'network.firewall_rule'],
  [/\bvpc\b|subnet|vlan|\bnetwork\b/i, 'network'],
  [
    /load.?balancer|ingress|nginx|haproxy|\balb\b|\bnlb\b|gateway|proxy|\bcdn\b/i,
    'network.load_balancer',
  ],
  [/postgres/i, 'db.postgresql'],
  [/mysql|mariadb/i, 'db.mysql'],
  [/elasticsearch|opensearch/i, 'db.elasticsearch'],
  [/redis|memcache|\bcache\b/i, 'db.redis'],
  [/kafka/i, 'messaging.kafka'],
  [/queue|topic|\bsqs\b|\bsns\b|pub.?sub|rabbit|event.?hub|stream/i, 'messaging.queue'],
  [/bucket|\bs3\b|blob|object.?storage/i, 'storage.bucket'],
  [/database|\bdb\b|sql|mongo|dynamo|cosmos|oracle|cassandra/i, 'database'],
  [/kubernetes|k8s|\bcluster\b/i, 'k8s.cluster'],
  [/namespace/i, 'k8s.namespace'],
  [/\bpods?\b/i, 'k8s.pod'],
  [/deployment/i, 'k8s.deployment'],
  [/\bnode\b/i, 'k8s.node'],
  [/\b(vm|host|server|instance|machine|bare.?metal|hypervisor)s?\b/i, 'host'],
  [/controller|operator|scheduler|autoscaler/i, 'controller'],
  [/\bteam\b|squad|on.?call|\bowner\b/i, 'team'],
  [/external|third.?party|saas|vendor|stripe|salesforce|okta/i, 'external_api'],
];

const SHAPE_TYPES: Record<string, string> = {
  cylinder: 'database',
  queue: 'messaging.queue',
  hexagon: 'controller',
  rhombus: 'network.load_balancer',
};

const ARCHITECTURE_ICON_TYPES: Record<string, string> = {
  database: 'database',
  disk: 'storage.bucket',
  cloud: 'cloud.service',
  internet: 'external_api',
  server: 'host',
};

const inferType = (label: string, shape?: string, isGroup?: boolean): string => {
  const byWord = KEYWORD_TYPES.find(([pattern]) => pattern.test(label));
  if (byWord) return byWord[1];
  if (isGroup) return 'group';
  return (shape && SHAPE_TYPES[shape]) || 'service';
};

const inferRelationshipType = (label: string): string => {
  const rules: Array<[RegExp, string]> = [
    [/read|query|select|fetch/i, 'reads_from'],
    [/write|insert|store|save/i, 'writes_to'],
    [/publish|produce|emit|send/i, 'publishes_to'],
    [/subscribe|consume|listen/i, 'subscribes_to'],
    [/runs? on|hosted|deployed on|scheduled on/i, 'runs_on'],
    [/depend/i, 'depends_on'],
    [/owned|owner/i, 'owned_by'],
    [/route|forward|proxy|balanc/i, 'routes_to'],
    [/replicat|sync|mirror/i, 'replicates_to'],
    [/manag|controls?\b|reconcil/i, 'managed_by'],
    [/deploy|render|promote/i, 'deployed_by'],
    [/call|request|http|grpc|rpc|invoke/i, 'calls'],
  ];
  return rules.find(([pattern]) => pattern.test(label))?.[1] ?? 'connects_to';
};

const cleanLabel = (raw: string): string =>
  raw
    .trim()
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^`([\s\S]*)`$/, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Severity from a class or a colour: the names and hues people use for "bad", "warning", "fine". */
const annotationsFromStyle = (text: string): ImpactMapAnnotations | undefined => {
  const lower = text.toLowerCase();
  if (/root.?cause/.test(lower)) return { role: 'root_cause', health: 'critical', impacted: true };
  if (/crit|fail|error|down|outage|\bred\b/.test(lower)) {
    return { health: 'critical', impacted: true };
  }
  if (/warn|degrad|amber|yellow|orange|slow/.test(lower))
    return { health: 'degraded', impacted: true };
  if (/healthy|\bok\b|green/.test(lower)) return { health: 'healthy' };
  const short = /#([0-9a-f]{3})\b/.exec(lower)?.[1];
  const hex = /#([0-9a-f]{6})\b/.exec(lower)?.[1] ?? short?.replace(/./g, (c) => c + c);
  if (hex) {
    const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
    if (r > 200 && g < 110 && b < 110) return { health: 'critical', impacted: true };
    if (r > 200 && g > 140 && b < 120) return { health: 'degraded', impacted: true };
    if (g > 150 && r < 150 && b < 150) return { health: 'healthy' };
  }
  return undefined;
};

interface Draft {
  id: string;
  label: string;
  shape?: string;
  isGroup?: boolean;
  parent?: string;
  classes: string[];
  typeId?: string;
}

const SHAPES: Array<[string, string, string]> = [
  ['((', '))', 'circle'],
  ['([', '])', 'stadium'],
  ['[(', ')]', 'cylinder'],
  ['[[', ']]', 'subroutine'],
  ['{{', '}}', 'hexagon'],
  ['[/', '/]', 'queue'],
  ['[\\', '\\]', 'queue'],
  ['>', ']', 'flag'],
  ['(', ')', 'round'],
  ['[', ']', 'rect'],
  ['{', '}', 'rhombus'],
];

const readNode = (
  text: string,
  at: number
): { id: string; label?: string; shape?: string; classes: string[]; end: number } | undefined => {
  const idMatch = /^\s*([A-Za-z0-9_]+)/.exec(text.slice(at));
  if (!idMatch) return undefined;
  let end = at + idMatch[0].length;
  const rest = text.slice(end);
  let label: string | undefined;
  let shape: string | undefined;
  const opener = SHAPES.find(([open]) => rest.startsWith(open));
  if (opener) {
    const [open, close, name] = opener;
    const body = rest.slice(open.length);
    const quoted = body.startsWith('"') ? body.indexOf('"', 1) : -1;
    const closeAt = body.indexOf(close, quoted > 0 ? quoted : 0);
    if (closeAt >= 0) {
      label = cleanLabel(body.slice(0, closeAt));
      shape = name;
      end += open.length + closeAt + close.length;
    }
  }
  const classes: string[] = [];
  const classMatch = /^:::([A-Za-z0-9_-]+)/.exec(text.slice(end));
  if (classMatch) {
    classes.push(classMatch[1]);
    end += classMatch[0].length;
  }
  return { id: idMatch[1], label, shape, classes, end };
};

const EDGE_PLAIN = /^\s*(<)?(-->|---|==>|===|-\.->|-\.-|--[ox])(?:\|([^|]*)\|)?\s*/;
const EDGE_TEXT = /^\s*(<)?(--|==|-\.)\s+(.+?)\s+(-->|---|==>|===|\.->|\.-)\s*/;

const readEdge = (
  text: string,
  at: number
): { label: string; thick: boolean; dotted: boolean; both: boolean; end: number } | undefined => {
  const slice = text.slice(at);
  const plain = EDGE_PLAIN.exec(slice);
  if (plain) {
    const [whole, back, op, label] = plain;
    return {
      label: cleanLabel(label ?? ''),
      thick: op.startsWith('='),
      dotted: op.includes('.'),
      both: Boolean(back),
      end: at + whole.length,
    };
  }
  const withText = EDGE_TEXT.exec(slice);
  if (withText) {
    const [whole, back, open, label] = withText;
    return {
      label: cleanLabel(label),
      thick: open === '==',
      dotted: open === '-.',
      both: Boolean(back),
      end: at + whole.length,
    };
  }
  return undefined;
};

const finish = (
  drafts: Map<string, Draft>,
  edges: Array<{
    source: string;
    target: string;
    label: string;
    thick: boolean;
    dotted: boolean;
    both: boolean;
  }>,
  classStyles: Map<string, ImpactMapAnnotations | undefined>,
  warnings: string[]
): Pick<ParsedMermaid, 'entities' | 'relationships' | 'warnings'> => {
  const entities = [...drafts.values()].map<ImpactMapEntity>((draft) => {
    const annotations = draft.classes
      .map((name) => classStyles.get(name) ?? annotationsFromStyle(name))
      .find(Boolean);
    return {
      id: draft.id,
      type_id: draft.typeId ?? inferType(draft.label, draft.shape, draft.isGroup),
      label: draft.label,
      source: 'diagram',
      confidence: 'medium',
      ...(draft.parent ? { parent_id: draft.parent } : {}),
      ...(annotations ? { annotations } : {}),
    };
  });
  const relationships: ImpactMapRelationship[] = [];
  edges.forEach(({ source, target, label, thick, dotted, both }) => {
    const directions = both
      ? [
          [source, target],
          [target, source],
        ]
      : [[source, target]];
    directions.forEach(([from, to]) => {
      relationships.push({
        type_id: inferRelationshipType(label),
        source_id: from,
        target_id: to,
        ...(label ? { label } : {}),
        ...(thick ? { on_critical_path: true } : {}),
        source: dotted ? 'inferred' : 'diagram',
        confidence: dotted ? 'low' : 'medium',
      });
    });
  });
  return { entities, relationships, warnings };
};

const parseFlowchart = (lines: string[]): ParsedMermaid => {
  const drafts = new Map<string, Draft>();
  const edges: Parameters<typeof finish>[1] = [];
  const classStyles = new Map<string, ImpactMapAnnotations | undefined>();
  const warnings: string[] = [];
  const groupStack: string[] = [];

  const touch = (node: NonNullable<ReturnType<typeof readNode>>): string => {
    const existing = drafts.get(node.id);
    const draft: Draft = existing ?? {
      id: node.id,
      label: node.id,
      classes: [],
      parent: groupStack[groupStack.length - 1],
    };
    if (node.label) draft.label = node.label;
    if (node.shape) draft.shape = node.shape;
    draft.classes.push(...node.classes);
    drafts.set(node.id, draft);
    return node.id;
  };

  const explicitTypes: Array<[string, string]> = [];
  for (const raw of lines) {
    const line = raw.trim();
    const hint = /^%%\s*impact-map:\s*type\s+(\S+)\s+(\S+)/.exec(line);
    if (hint) {
      explicitTypes.push([hint[1], hint[2]]);
      continue;
    }
    if (!line || line.startsWith('%%') || /^(direction|click|linkStyle|style)\b/.test(line))
      continue;

    const subgraph = /^subgraph\s+(.+)$/.exec(line);
    if (subgraph) {
      const titled = /^([A-Za-z0-9_]+)\s*\[(.*)\]$/.exec(subgraph[1].trim());
      const title = cleanLabel(titled ? titled[2] : subgraph[1]);
      const id = titled ? titled[1] : title.replace(/\W+/g, '_');
      drafts.set(id, {
        id,
        label: title,
        isGroup: true,
        classes: [],
        parent: groupStack[groupStack.length - 1],
      });
      groupStack.push(id);
      continue;
    }
    if (line === 'end') {
      groupStack.pop();
      continue;
    }
    const classDef = /^classDef\s+(\S+)\s+(.*)$/.exec(line);
    if (classDef) {
      classDef[1]
        .split(',')
        .forEach((name) => classStyles.set(name, annotationsFromStyle(`${name} ${classDef[2]}`)));
      continue;
    }
    const assign = /^class\s+(\S+)\s+(\S+)$/.exec(line);
    if (assign) {
      assign[1].split(',').forEach((id) => drafts.get(id)?.classes.push(assign[2]));
      continue;
    }

    for (const statement of line.split(/;\s*/).filter(Boolean)) {
      let at = 0;
      let previous: string[] = [];
      let pendingEdge: ReturnType<typeof readEdge>;
      while (at < statement.length) {
        const ids: string[] = [];
        for (;;) {
          const node = readNode(statement, at);
          if (!node) break;
          ids.push(touch(node));
          at = node.end;
          const amp = /^\s*&\s*/.exec(statement.slice(at));
          if (!amp) break;
          at += amp[0].length;
        }
        if (ids.length === 0) {
          warnings.push(`Could not read: ${statement.slice(at, at + 60)}`);
          break;
        }
        if (pendingEdge) {
          const edge = pendingEdge;
          previous.forEach((source) =>
            ids.forEach((target) => edges.push({ source, target, ...edge }))
          );
        }
        previous = ids;
        const edge = readEdge(statement, at);
        if (!edge) break;
        pendingEdge = edge;
        at = edge.end;
      }
    }
  }
  explicitTypes.forEach(([id, typeId]) => {
    const draft = drafts.get(id);
    if (draft) draft.typeId = typeId;
  });
  edges.forEach(({ source, target }) =>
    [source, target].forEach((id) => {
      if (!drafts.has(id)) drafts.set(id, { id, label: id, classes: [] });
    })
  );
  return { diagram: 'flowchart', ...finish(drafts, edges, classStyles, warnings) };
};

const parseArchitecture = (lines: string[]): ParsedMermaid => {
  const drafts = new Map<string, Draft>();
  const edges: Parameters<typeof finish>[1] = [];
  const warnings: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const node =
      /^(group|service)\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?(?:\[([^\]]*)\])?(?:\s+in\s+([A-Za-z0-9_]+))?$/.exec(
        line
      );
    if (node) {
      const [, kind, id, icon, label, parent] = node;
      drafts.set(id, {
        id,
        label: cleanLabel(label ?? id),
        isGroup: kind === 'group',
        parent,
        classes: [],
        // The words win over the icon (a "Cloud region" group has a cloud icon); a group is never
        // the icon's type, and a service takes it only when its words say nothing.
        typeId:
          kind === 'service' &&
          icon &&
          ARCHITECTURE_ICON_TYPES[icon] &&
          !KEYWORD_TYPES.some(([pattern]) => pattern.test(label ?? id))
            ? ARCHITECTURE_ICON_TYPES[icon]
            : undefined,
      });
      continue;
    }
    const edge = /^([A-Za-z0-9_]+)(?::[LRTB])?\s*(<)?--(>)?\s*(?:[LRTB]:)?([A-Za-z0-9_]+)/.exec(
      line
    );
    if (edge) {
      edges.push({
        source: edge[1],
        target: edge[4],
        label: '',
        thick: false,
        dotted: false,
        both: Boolean(edge[2] && edge[3]),
      });
    }
  }
  return { diagram: 'architecture', ...finish(drafts, edges, new Map(), warnings) };
};

const parseSequence = (lines: string[]): ParsedMermaid => {
  const drafts = new Map<string, Draft>();
  const edges: Parameters<typeof finish>[1] = [];
  const seen = new Set<string>();
  const add = (id: string, label?: string) => {
    if (!drafts.has(id)) drafts.set(id, { id, label: label ?? id, classes: [] });
    else if (label) drafts.get(id)!.label = label;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const participant = /^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?$/.exec(line);
    if (participant) {
      add(participant[1], participant[2] ? cleanLabel(participant[2]) : undefined);
      continue;
    }
    const message = /^([A-Za-z0-9_]+)\s*(--?>>?|--?[x)])\+?-?\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(
      line
    );
    if (message) {
      add(message[1]);
      add(message[3]);
      const key = `${message[1]}>${message[3]}>${message[4]}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          source: message[1],
          target: message[3],
          label: cleanLabel(message[4]),
          thick: false,
          dotted: message[2].startsWith('--'),
          both: false,
        });
      }
    }
  }
  return { diagram: 'sequence', ...finish(drafts, edges, new Map(), []) };
};

/** Reads a Mermaid diagram (flowchart, architecture-beta or sequence) into impact map parts. */
export const parseMermaid = (source: string): ParsedMermaid => {
  const text = source.replace(/^```(?:mermaid)?\s*|```\s*$/gm, '');
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim() && !line.trim().startsWith('%%'));
  const header = headerIndex >= 0 ? lines[headerIndex].trim() : '';
  const body = lines.slice(headerIndex + 1);
  if (/^(flowchart|graph)\b/.test(header)) return parseFlowchart(body);
  if (/^architecture(-beta)?\b/.test(header)) return parseArchitecture(body);
  if (/^sequenceDiagram\b/.test(header)) return parseSequence(body);
  return {
    diagram: 'unsupported',
    entities: [],
    relationships: [],
    warnings: [
      `"${header.slice(
        0,
        40
      )}" is not a supported Mermaid diagram: read it by hand and record the entities and links it shows.`,
    ],
  };
};

const SERVICE_SHAPE = ['((', '))'] as const;
const DATABASE_SHAPE = ['[(', ')]'] as const;
const QUEUE_SHAPE = ['[/', '/]'] as const;
const DEFAULT_SHAPE = ['[', ']'] as const;

const shapeFor = (
  entity: ImpactMapEntity,
  type?: ImpactMapEntityType
): readonly [string, string] => {
  if (type?.kind === 'service') return SERVICE_SHAPE;
  if (/^(database|db\.)/.test(entity.type_id)) return DATABASE_SHAPE;
  if (/^(messaging\.|storage\.)/.test(entity.type_id)) return QUEUE_SHAPE;
  return DEFAULT_SHAPE;
};

const quote = (text: string): string => `"${text.replace(/"/g, "'")}"`;

/**
 * Writes an impact map as a Mermaid flowchart: parents become nested subgraphs, a service is a
 * circle, a database a cylinder, a queue a parallelogram, critical-path edges are thick and
 * inferred edges dotted, and root cause and impacted entities carry classes. A `%% impact-map`
 * comment per entity keeps its exact type, so reading the diagram back gives the same map.
 */
export const impactMapToMermaid = ({
  entities,
  relationships,
  entityTypes = [],
  relationshipTypes = [],
}: {
  entities: ImpactMapEntity[];
  relationships: ImpactMapRelationship[];
  entityTypes?: ImpactMapEntityType[];
  relationshipTypes?: ImpactMapRelationshipType[];
}): string => {
  const typeById = new Map(entityTypes.map((type) => [type.id, type]));
  const labelById = new Map(relationshipTypes.map(({ id, label }) => [id, label]));
  // Keep an id Mermaid can read as it is, so the diagram reads back as the same entities.
  const taken = new Set(entities.map(({ id }) => id));
  const reserved = /^(end|graph|flowchart|subgraph|class|classDef|style|click|direction)$/;
  const ids = new Map(
    entities.map(({ id }, index) => {
      if (/^[A-Za-z0-9_]+$/.test(id) && !reserved.test(id)) return [id, id];
      let name = `n${index}`;
      while (taken.has(name)) name = `_${name}`;
      return [id, name];
    })
  );
  const idOf = (id: string) => ids.get(id) ?? id;
  const children = new Map<string | undefined, ImpactMapEntity[]>();
  const known = new Set(entities.map(({ id }) => id));
  entities.forEach((entity) => {
    const parent = entity.parent_id && known.has(entity.parent_id) ? entity.parent_id : undefined;
    children.set(parent, [...(children.get(parent) ?? []), entity]);
  });

  const lines = ['flowchart LR'];
  const hints: string[] = [];
  const drawn = new Set<string>();
  const draw = (entity: ImpactMapEntity, depth: number) => {
    if (drawn.has(entity.id)) return;
    drawn.add(entity.id);
    const indent = '  '.repeat(depth + 1);
    const members = children.get(entity.id) ?? [];
    hints.push(`  %% impact-map: type ${idOf(entity.id)} ${entity.type_id}`);
    if (members.length > 0) {
      lines.push(`${indent}subgraph ${idOf(entity.id)} [${quote(entity.label)}]`);
      members.forEach((member) => draw(member, depth + 1));
      lines.push(`${indent}end`);
      return;
    }
    const [open, close] = shapeFor(entity, typeById.get(entity.type_id));
    const { role, health, impacted } = entity.annotations ?? {};
    const cls =
      role === 'root_cause'
        ? ':::rootCause'
        : impacted || health === 'critical' || health === 'degraded'
        ? ':::impacted'
        : '';
    lines.push(`${indent}${idOf(entity.id)}${open}${quote(entity.label)}${close}${cls}`);
  };
  (children.get(undefined) ?? []).forEach((entity) => draw(entity, 0));

  relationships.forEach((relationship) => {
    const label = relationship.label ?? labelById.get(relationship.type_id) ?? relationship.type_id;
    const arrow = relationship.on_critical_path
      ? '==>'
      : relationship.source === 'inferred'
      ? '-.->'
      : '-->';
    lines.push(
      `  ${idOf(relationship.source_id)} ${arrow}|${label.replace(/\|/g, '/')}| ${idOf(
        relationship.target_id
      )}`
    );
  });
  lines.push(...hints);
  lines.push(
    '  classDef rootCause fill:#bd271e,stroke:#7a1a14,color:#fff',
    '  classDef impacted stroke:#bd271e,stroke-width:3px'
  );
  return lines.join('\n');
};
