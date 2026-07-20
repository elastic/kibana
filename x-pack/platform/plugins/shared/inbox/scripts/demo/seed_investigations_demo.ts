/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rebalances investigation queue data for the Phase 5 triage UI demo.
 *
 * Takes existing conversations from GET /internal/inbox/investigations, rewrites
 * a target subset with realistic severity/title/summary/watch provenance, and
 * deletes the remainder (e.g. scheduled-run spam that all landed in TUNE).
 *
 * Usage:
 *   KIBANA_URL=http://localhost:5601/kbn node --import tsx \
 *     x-pack/platform/plugins/shared/inbox/scripts/demo/seed_investigations_demo.ts
 *
 * Options:
 *   --target 28        How many investigations to keep (default 28)
 *   --dry-run          Print planned changes without writing
 *   --no-delete        Rebalance in place only; do not delete extras
 *
 * Env:
 *   KIBANA_URL, KIBANA_USERNAME, KIBANA_PASSWORD, KIBANA_SPACE_ID
 *   ES_URL, ES_AUTH, ES_CONVERSATIONS_INDEX (default .chat-conversations)
 */

interface SeedConfig {
  kibanaUrl: string;
  username: string;
  password: string;
  spaceId: string;
}

interface InvestigationRow {
  conversation_id: string;
  title: string;
  updated_at: string;
  source_watch_id: string;
  watch_execution_id: string;
  severity?: string;
  user_name?: string;
}

interface ListInvestigationsResponse {
  investigations: InvestigationRow[];
}

interface DemoScenario {
  severity: string;
  title: string;
  summary: string;
  recommended_action: string;
  confidence: number;
  source_watch_id: string;
  hoursAgo: number;
}

const CONFIG: SeedConfig = {
  kibanaUrl: process.env.KIBANA_URL ?? 'http://localhost:5601/kbn',
  username: process.env.KIBANA_USERNAME ?? 'elastic',
  password: process.env.KIBANA_PASSWORD ?? 'changeme',
  spaceId: process.env.KIBANA_SPACE_ID ?? 'default',
};

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    severity: 'critical',
    title: 'Watch Floor · ransomware staging on DC01',
    summary:
      'PowerShell download cradle and encoded command execution on domain controller DC01 correlated with Emotet C2. Multiple hosts in finance VLAN contacted same external IP within 15 minutes.',
    recommended_action: 'Isolate DC01 and finance VLAN hosts; escalate to incident response',
    confidence: 0.92,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 1,
  },
  {
    severity: 'critical',
    title: 'Watch Floor · privileged account brute force',
    summary:
      '427 failed logins for svc_backup across 12 domain controllers in 8 minutes, followed by successful auth from unusual geolocation (RU). Matches MITRE T1110.',
    recommended_action: 'Disable svc_backup, force password reset, block source IP at perimeter',
    confidence: 0.88,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 2,
  },
  {
    severity: 'critical',
    title: 'Watch Dark · lateral movement via RDP',
    summary:
      'RDP session from compromised workstation WIN-4421 to SQL-SERVER-03 outside business hours. Prior Cobalt Strike beacon on source host 20 minutes earlier.',
    recommended_action: 'Contain both hosts; preserve memory forensics',
    confidence: 0.9,
    source_watch_id: 'system-inbox-watch-dark',
    hoursAgo: 3,
  },
  {
    severity: 'high',
    title: 'Watch Floor · suspicious PowerShell on endpoint',
    summary:
      'Encoded PowerShell invoking DownloadString from paste site on laptop assigned to finance user. No prior script-block history for this host.',
    recommended_action: 'Review endpoint telemetry; quarantine if execution confirmed',
    confidence: 0.81,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 4,
  },
  {
    severity: 'high',
    title: 'Watch Floor · impossible travel sign-in',
    summary:
      'User jsmith authenticated from Austin then Frankfurt within 22 minutes. Both sessions passed MFA. No VPN overlap in proxy logs.',
    recommended_action: 'Validate with user; reset credentials if unconfirmed',
    confidence: 0.76,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 5,
  },
  {
    severity: 'high',
    title: 'Watch Officer · data exfiltration pattern',
    summary:
      'Outbound 2.1 GB HTTPS upload from file server to unknown cloud storage during maintenance window. Destination domain registered 3 days ago.',
    recommended_action: 'Block destination; inspect DLP logs and file access audit',
    confidence: 0.84,
    source_watch_id: 'system-inbox-watch-officer',
    hoursAgo: 6,
  },
  {
    severity: 'high',
    title: 'Watch Floor · malware hash on workstation',
    summary:
      'Elastic Defend flagged known malicious SHA256 on developer laptop. Process tree shows child of node.exe — possible supply-chain script.',
    recommended_action: 'Isolate endpoint; submit sample to sandbox analysis',
    confidence: 0.79,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 8,
  },
  {
    severity: 'high',
    title: 'Watch Deep · C2 beaconing interval',
    summary:
      'Periodic HTTPS POST every 60s to low-reputation domain from server in DMZ. JA3 fingerprint matches historical Emotet family.',
    recommended_action: 'Block domain; capture PCAP; hunt for peer beacons',
    confidence: 0.86,
    source_watch_id: 'system-inbox-watch-deep',
    hoursAgo: 10,
  },
  {
    severity: 'medium',
    title: 'Watch Floor · unusual AWS API calls',
    summary:
      'IAM user cloud-deploy invoked DeleteTrail and CreateAccessKey APIs. User normally limited to read-only S3. Change approved in ticket IT-4421 yesterday.',
    recommended_action: 'Confirm change ticket; revert if unauthorized',
    confidence: 0.65,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 12,
  },
  {
    severity: 'medium',
    title: 'Watch Floor · new service account activity',
    summary:
      'First-seen service principal sp-backup-sync authenticating to Azure AD from new IP range. Matches planned backup vendor migration window.',
    recommended_action: 'Validate with identity team before closing',
    confidence: 0.58,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 14,
  },
  {
    severity: 'medium',
    title: 'Watch Officer · spike in failed VPN logins',
    summary:
      'Failed VPN authentications up 340% vs 7-day baseline. Concentrated on single country code. No successful follow-on auth observed.',
    recommended_action: 'Monitor; enable geo-blocking if trend continues',
    confidence: 0.62,
    source_watch_id: 'system-inbox-watch-officer',
    hoursAgo: 18,
  },
  {
    severity: 'medium',
    title: 'Watch Floor · DNS tunneling heuristic',
    summary:
      'Long subdomain entropy queries to *.analytics-cdn.net from marketing subnet. Volume low; could be legitimate analytics SDK.',
    recommended_action: 'Inspect PCAP sample; compare to vendor allowlist',
    confidence: 0.55,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 20,
  },
  {
    severity: 'medium',
    title: 'Watch Floor · Okta MFA fatigue pattern',
    summary:
      '12 push denials then acceptance for executive account within 4 minutes. Source IP matches corporate VPN pool.',
    recommended_action: 'Contact user via out-of-band channel to verify',
    confidence: 0.71,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 22,
  },
  {
    severity: 'medium',
    title: 'Watch Deep · rare parent-child process',
    summary:
      'excel.exe spawning mshta.exe on finance desktop. Macro disabled per policy — may be user bypass attempt.',
    recommended_action: 'Collect EDR timeline; interview user if pattern repeats',
    confidence: 0.67,
    source_watch_id: 'system-inbox-watch-deep',
    hoursAgo: 26,
  },
  {
    severity: 'low',
    title: 'Watch Floor · port scan from internal host',
    summary:
      'Single host performed SYN sweep on /24 during vulnerability assessment window. Matches scheduled Nessus scan asset.',
    recommended_action: 'Confirm scan schedule; close as benign if matched',
    confidence: 0.48,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 30,
  },
  {
    severity: 'low',
    title: 'Watch Floor · new software installed',
    summary:
      'Zoom client update pushed via SCCM to 14 laptops. Binary signed by Zoom Video Communications. No threat intel hits.',
    recommended_action: 'No action required unless install outside change window',
    confidence: 0.42,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 36,
  },
  {
    severity: 'low',
    title: 'Watch Officer · firewall rule change',
    summary:
      'New allow rule for vendor support IP added by netops automation. Ticket NET-8812 references same change.',
    recommended_action: 'Verify ticket closure; document exception',
    confidence: 0.51,
    source_watch_id: 'system-inbox-watch-officer',
    hoursAgo: 40,
  },
  {
    severity: 'low',
    title: 'Watch Floor · after-hours login',
    summary:
      'Developer authenticated to GitLab at 02:14 local time. Historical pattern shows release-week late commits for this user.',
    recommended_action: 'Monitor only; escalate if repo exfil follows',
    confidence: 0.39,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 48,
  },
  {
    severity: 'low',
    title: 'Watch Floor · TLS cert renewal',
    summary:
      'Automated certbot renewal triggered external connection spike on ingress load balancer. Expected quarterly behavior.',
    recommended_action: 'Close as benign true positive',
    confidence: 0.45,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 52,
  },
  {
    severity: 'false_positive',
    title: 'Watch Floor · vulnerability scanner noise',
    summary:
      'Qualys external scan triggered "SQL injection" rule on WAF test endpoint /health?probe=1. Endpoint is intentionally unauthenticated.',
    recommended_action: 'Tune rule to exclude health-check paths',
    confidence: 0.91,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 8,
  },
  {
    severity: 'false_positive',
    title: 'Watch Floor · backup job flagged as exfil',
    summary:
      'Veeam backup to DR site matched "large outbound transfer" threshold. Same volume and destination as prior 90 days.',
    recommended_action: 'Add backup subnet to rule exception',
    confidence: 0.87,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 16,
  },
  {
    severity: 'inconclusive',
    title: 'Watch Floor · empty alert context',
    summary:
      'Manual watch run with no alert payload attached. Triage could not retrieve rule name, entities, or alert UUID.',
    recommended_action: 'Re-run watch with alert ID in inputs',
    confidence: 0,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 1,
  },
  {
    severity: 'inconclusive',
    title: 'Watch Floor · scheduled run — no alert',
    summary:
      'Task Manager scheduled trigger fired without security event context. Classified as platform heartbeat, not a detection.',
    recommended_action: 'No action for scheduled empty runs',
    confidence: 0.15,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 2,
  },
  {
    severity: 'inconclusive',
    title: 'Watch Floor · partial alert document',
    summary:
      'Alert missing host.name and user.name fields. Related alerts search returned zero matches in 24h window.',
    recommended_action: 'Enrich detection rule to require core ECS fields',
    confidence: 0.22,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 6,
  },
  {
    severity: 'inconclusive',
    title: 'Watch Officer · low-confidence ML anomaly',
    summary:
      'Unsupervised ML job flagged rare process name on single host once. Insufficient context for TP/FP disposition.',
    recommended_action: 'Collect peer group baseline before re-alerting',
    confidence: 0.31,
    source_watch_id: 'system-inbox-watch-officer',
    hoursAgo: 12,
  },
  {
    severity: 'medium',
    title: 'Watch Floor · suspicious inbox rule',
    summary:
      'Mailbox rule forwarding all mail to external address created for executive assistant account. User on PTO; delegate access documented.',
    recommended_action: 'Confirm delegate policy; remove rule if unauthorized',
    confidence: 0.64,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 15,
  },
  {
    severity: 'high',
    title: 'Watch Floor · Kerberoasting attempt',
    summary:
      'Service ticket request for unusual SPNs from non-admin workstation. Volume below threshold but technique matches T1558.003.',
    recommended_action: 'Hunt for follow-on ticket requests; review SPN exposure',
    confidence: 0.73,
    source_watch_id: 'system-inbox-watch-floor',
    hoursAgo: 7,
  },
  {
    severity: 'low',
    title: 'Watch Deep · dev container outbound',
    summary:
      'Ephemeral CI runner reached npm registry and GitHub — expected for build pipeline. Destination IPs on allowlist.',
    recommended_action: 'Document as expected dev behavior',
    confidence: 0.44,
    source_watch_id: 'system-inbox-watch-deep',
    hoursAgo: 60,
  },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  let target = 28;
  let dryRun = false;
  let noDelete = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--no-delete') {
      noDelete = true;
    }
  }

  return { target, dryRun, noDelete };
};

const spacePrefix = (config: SeedConfig) =>
  config.spaceId && config.spaceId !== 'default' ? `/s/${config.spaceId}` : '';

const authHeaders = (config: SeedConfig) => ({
  Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
  'kbn-xsrf': 'true',
  'content-type': 'application/json',
});

const esConfig = (config: SeedConfig) => ({
  url: process.env.ES_URL ?? 'http://localhost:9200',
  auth: process.env.ES_AUTH ?? `${config.username}:${config.password}`,
  index: process.env.ES_CONVERSATIONS_INDEX ?? '.chat-conversations',
});

const esHeaders = (auth: string) => ({
  Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
  'content-type': 'application/json',
});

const credentialsForUser = (username: string, fallbackPassword: string) => {
  const envKey = `KIBANA_PASSWORD_${username.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  return {
    username,
    password: process.env[envKey] ?? process.env.KIBANA_PASSWORD ?? fallbackPassword,
  };
};

const listInvestigations = async (config: SeedConfig): Promise<InvestigationRow[]> => {
  const url = `${config.kibanaUrl}${spacePrefix(config)}/internal/inbox/investigations`;
  const response = await fetch(url, {
    headers: {
      ...authHeaders(config),
      'elastic-api-version': '1',
      'x-elastic-internal-origin': 'kibana',
    },
  });
  if (!response.ok) {
    throw new Error(`List investigations failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as ListInvestigationsResponse;
  const investigations = body.investigations ?? [];
  const owners = await fetchConversationOwners(
    config,
    investigations.map((row) => row.conversation_id)
  );
  return investigations.map((row) => ({
    ...row,
    user_name: owners.get(row.conversation_id) ?? config.username,
  }));
};

const fetchConversationOwners = async (
  config: SeedConfig,
  conversationIds: string[]
): Promise<Map<string, string>> => {
  const owners = new Map<string, string>();
  if (conversationIds.length === 0) {
    return owners;
  }

  const { url, auth, index } = esConfig(config);
  const response = await fetch(`${url}/${index}/_mget`, {
    method: 'POST',
    headers: esHeaders(auth),
    body: JSON.stringify({
      docs: conversationIds.map((id) => ({ _id: id, _source: ['user_name'] })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Owner lookup failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as {
    docs: Array<{ _id: string; found: boolean; _source?: { user_name?: string } }>;
  };
  for (const doc of body.docs) {
    if (doc.found && doc._source?.user_name) {
      owners.set(doc._id, doc._source.user_name);
    }
  }
  return owners;
};

const kibanaAuthHeaders = (username: string, password: string) => ({
  Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  'kbn-xsrf': 'true',
  'content-type': 'application/json',
  'elastic-api-version': '2023-10-31',
  'x-elastic-internal-origin': 'kibana',
});

const updateInvestigation = async (
  config: SeedConfig,
  row: InvestigationRow,
  scenario: DemoScenario
) => {
  const owner = row.user_name ?? config.username;
  const { username, password } = credentialsForUser(owner, config.password);
  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/agent_builder/conversations/${
    row.conversation_id
  }`;
  const body = {
    title: scenario.title,
    status: 'completed',
    state: {
      daybreak_proposal: {
        title: scenario.title,
        summary: scenario.summary,
        severity: scenario.severity,
        status: 'proposed',
        recommended_action: scenario.recommended_action,
        confidence: String(scenario.confidence),
        source_watch_id: scenario.source_watch_id,
        watch_execution_id: row.watch_execution_id,
        evidence_ref: ['daybreak-evidence'],
      },
    },
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: kibanaAuthHeaders(username, password),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Update ${row.conversation_id} as ${username} failed: ${
        response.status
      } ${await response.text()}`
    );
  }
};

const deleteConversation = async (config: SeedConfig, row: InvestigationRow) => {
  const owner = row.user_name ?? config.username;
  const { username, password } = credentialsForUser(owner, config.password);
  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/agent_builder/conversations/${
    row.conversation_id
  }`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: kibanaAuthHeaders(username, password),
  });
  if (!response.ok && response.status !== 404) {
    if (response.status === 401 || response.status === 403) {
      // eslint-disable-next-line no-console
      console.warn(
        `Skipped delete ${row.conversation_id} (${username}): ${
          response.status
        } — set KIBANA_PASSWORD_${username.toUpperCase()} if needed`
      );
      return;
    }
    throw new Error(
      `Delete ${row.conversation_id} as ${username} failed: ${
        response.status
      } ${await response.text()}`
    );
  }
};

const bucketForSeverity = (severity: string) => {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'high') return 'CONTAIN';
  if (s === 'medium') return 'ESCALATE';
  if (s === 'low') return 'INVESTIGATE';
  return 'TUNE';
};

const main = async () => {
  const { target, dryRun, noDelete } = parseArgs();
  const scenarios = DEMO_SCENARIOS.slice(0, target);

  const existing = await listInvestigations(CONFIG);
  // eslint-disable-next-line no-console
  console.log(
    `Found ${existing.length} investigations; rebalancing to ${scenarios.length} demo rows`
  );

  const ranked = [...existing].sort((a, b) => {
    const ownerRank = (row: InvestigationRow) => (row.user_name === CONFIG.username ? 0 : 1);
    return ownerRank(a) - ownerRank(b) || b.updated_at.localeCompare(a.updated_at);
  });
  const keep = ranked.slice(0, scenarios.length);
  const keepIds = new Set(keep.map((row) => row.conversation_id));
  const remove = ranked.filter((row) => !keepIds.has(row.conversation_id));

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log('Dry run — would update:');
    for (let i = 0; i < keep.length; i++) {
      const scenario = scenarios[i];
      // eslint-disable-next-line no-console
      console.log(
        `  ${keep[i].conversation_id} → ${bucketForSeverity(scenario.severity)} / ${
          scenario.severity
        } / ${scenario.title}`
      );
    }
    if (!noDelete) {
      // eslint-disable-next-line no-console
      console.log(`Would delete ${remove.length} excess investigations`);
    }
    return;
  }

  for (let i = 0; i < keep.length; i++) {
    const row = keep[i];
    const scenario = scenarios[i];
    await updateInvestigation(CONFIG, row, scenario);
    // eslint-disable-next-line no-console
    console.log(
      `Updated ${row.conversation_id} → ${bucketForSeverity(scenario.severity)} (${
        scenario.severity
      })`
    );
  }

  if (!noDelete && remove.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`Deleting ${remove.length} excess investigations...`);
    for (const row of remove) {
      await deleteConversation(CONFIG, row);
    }
  }

  const counts = scenarios.reduce<Record<string, number>>((acc, s) => {
    const bucket = bucketForSeverity(s.severity);
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  // eslint-disable-next-line no-console
  console.log('Done. Bucket distribution:', counts);
  // eslint-disable-next-line no-console
  console.log('Refresh /app/inbox/investigations to see the triage queue.');
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
