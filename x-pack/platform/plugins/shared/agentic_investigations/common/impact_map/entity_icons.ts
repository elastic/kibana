/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactMapEntityType } from './impact_map';
import { getLegacyDependencyIcon, KNOWN_EUI_ICONS } from './built_in_types';

/** Default icon for application code when no APM agent logo is known. */
export const DEFAULT_SERVICE_ICON = 'apps';

/** Default icon for hosts, VMs and other unnamed infrastructure. */
export const DEFAULT_INFRASTRUCTURE_ICON = 'compute';

const KNOWN_ICONS = new Set<string>(KNOWN_EUI_ICONS);

/**
 * Name → icon guesses for types and entity labels the agent left bare. Patterned after cloud
 * architecture diagrams: each thing should look like what it is (Elasticsearch, a zone, a
 * controller, a proxy), never an empty shape.
 */
const ICON_HEURISTICS: ReadonlyArray<{ pattern: RegExp; icon: string }> = [
  { pattern: /hosted\s*elasticsearch|elastic\s*cloud|\bessd\b/i, icon: 'logoElastic' },
  { pattern: /elasticsearch|\bes[-_]?(cluster|node|index|search|deploy)/i, icon: 'logoElasticsearch' },
  { pattern: /\bkibana\b/i, icon: 'logoKibana' },
  { pattern: /\blogstash\b/i, icon: 'logoLogstash' },
  { pattern: /\b(file|metric|audit|heart|packet)?beats?\b/i, icon: 'logoBeats' },
  { pattern: /kubernetes|k8s|kube-?dns|coredns|kubectl/i, icon: 'logoKubernetes' },
  { pattern: /\bdocker\b|container(?![-_\s]?manager)/i, icon: 'logoDocker' },
  { pattern: /postgres|postgresql/i, icon: 'logoPostgres' },
  { pattern: /\bmysql\b/i, icon: 'logoMySQL' },
  { pattern: /\bmongo(db)?\b/i, icon: 'logoMongodb' },
  { pattern: /\bredis\b/i, icon: 'logoRedis' },
  { pattern: /\bkafka\b/i, icon: 'logoKafka' },
  { pattern: /rabbitmq/i, icon: 'logoRabbitmq' },
  { pattern: /\bnginx\b/i, icon: 'logoNginx' },
  { pattern: /haproxy/i, icon: 'logoHAproxy' },
  { pattern: /\bapache\b/i, icon: 'logoApache' },
  { pattern: /\betcd\b/i, icon: 'logoEtcd' },
  { pattern: /prometheus/i, icon: 'logoPrometheus' },
  { pattern: /\bgcp\b|google\s*cloud|europe-|asia-|us-(central|east|west|south)|northamerica-|australia-/i, icon: 'logoGCP' },
  { pattern: /\baws\b|amazon\s*web|\bec2\b|\beks\b/i, icon: 'logoAWS' },
  { pattern: /\bazure\b/i, icon: 'logoAzure' },
  { pattern: /github|repositor(y|ies)|\brepo\b/i, icon: 'logoGithub' },
  { pattern: /\bslack\b/i, icon: 'logoSlack' },
  { pattern: /allocator|compute|instance|\bvm\b|virtual\s*machine/i, icon: 'compute' },
  { pattern: /constructor|controller|operator|scheduler|autoscaler/i, icon: 'gear' },
  { pattern: /\bdns\b|nameserver|name\s*server/i, icon: 'globe' },
  { pattern: /proxy|gateway|ingress|load[-_\s]?balancer|credproxy|haproxy/i, icon: 'merge' },
  { pattern: /\bapi\b|[-_]api$|^api[-_]/i, icon: 'plugs' },
  { pattern: /firewall|security\s*group|network\s*policy/i, icon: 'shield' },
  { pattern: /storage|bucket|blob|volume|disk/i, icon: 'storage' },
  { pattern: /queue|topic|pubsub|event\s*stream/i, icon: 'package' },
  { pattern: /database|\bdb\b/i, icon: 'database' },
  // After Kubernetes / Elasticsearch rules: a bare "deployment" or "cluster" without those words.
  { pattern: /\b(cluster|deployment|hosted)\b/i, icon: 'cluster' },
  { pattern: /region|availability[-_\s]?zone|\baz\b|data[-_\s]?cent(er|re)/i, icon: 'mapMarker' },
  { pattern: /network|vpc|subnet|vlan/i, icon: 'link' },
  { pattern: /pipeline|cicd|gitops|build/i, icon: 'branch' },
  { pattern: /team|owner|on[-_\s]?call/i, icon: 'users' },
  { pattern: /investigat|nightshift|runbook|incident/i, icon: 'sparkles' },
  { pattern: /pod[-_\s]?kill|chaos|fault|disruption|outage/i, icon: 'bolt' },
  { pattern: /alert|alarm|pager/i, icon: 'bell' },
  { pattern: /lock|secret|cert|tls|rbac|iam/i, icon: 'lock' },
  { pattern: /group|namespace|environment|tier/i, icon: 'nested' },
];

/** Whether an icon name is one EUI can draw. */
export const isKnownEuiIcon = (icon: string): boolean => KNOWN_ICONS.has(icon);

/**
 * An icon for every entity: named on the type, else guessed from the type id / labels (the way a
 * cloud architecture diagram picks a glyph per resource), else a kind default. Never empty.
 */
export const resolveEntityIcon = (
  type?: ImpactMapEntityType,
  entityLabel?: string
): string => {
  const named = type?.icon?.eui_icon;
  if (named && KNOWN_ICONS.has(named)) {
    return named;
  }

  const haystack = `${type?.id ?? ''} ${type?.label ?? ''} ${entityLabel ?? ''}`;
  for (const { pattern, icon } of ICON_HEURISTICS) {
    if (pattern.test(haystack) && KNOWN_ICONS.has(icon)) {
      return icon;
    }
  }

  if (type?.kind === 'dependency') {
    return getLegacyDependencyIcon(type.icon);
  }
  if (type?.kind === 'infrastructure') {
    return DEFAULT_INFRASTRUCTURE_ICON;
  }
  return DEFAULT_SERVICE_ICON;
};
