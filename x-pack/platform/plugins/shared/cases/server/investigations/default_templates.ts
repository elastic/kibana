/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationType,
  ProcedureTemplateTask,
} from '../../common/investigations/types';

const t = (
  title: string,
  phase: ProcedureTemplateTask['phase'],
  description: string,
  required: boolean,
  ownerType: ProcedureTemplateTask['owner_type'],
  extra: Partial<ProcedureTemplateTask> = {}
): ProcedureTemplateTask => ({
  title,
  phase,
  description,
  required,
  owner_type: ownerType,
  owner: null,
  auto: null,
  after: null,
  ...extra,
});

const claim = (question: string) => ({ auto: { type: 'claim' as const, question } });
const action = (category: 'Contain' | 'Block' | 'Collect evidence') => ({
  auto: { type: 'action' as const, category },
});

export const DEFAULT_PROCEDURE_TEMPLATES: Record<string, ProcedureTemplateTask[]> = {
  Malware: [
    t('Confirm the alert is not a known false positive', 'Triage', 'Check rule history and recent similar alerts.', true, 'agent'),
    t('Identify the affected hosts and identities', 'Triage', 'List the hosts, users and non-human identities in scope.', true, 'agent'),
    t('Determine how the malware executed', 'Investigate', 'Settled by a claim about how the code ran.', true, 'agent', claim('Did rundll32.exe load an untrusted DLL?')),
    t('Check for credential access', 'Investigate', 'Settled by a claim about credential material.', true, 'agent', claim('Did the shell access credential material?')),
    t('Check for outbound command and control', 'Investigate', 'Settled by a claim about external destinations.', true, 'agent', claim('Did the host contact external infrastructure?')),
    t('Check for lateral movement', 'Investigate', 'Settled by a claim about spread to other hosts.', true, 'person', claim('Did the actor move laterally?')),
    t('Establish where the malware came from', 'Investigate', 'Settled by a claim about the origin of the file.', false, 'agent', claim('Where did upd.dll come from?')),
    t('Search the fleet for the same hash and connections', 'Investigate', 'Look for the same file or destination on other hosts.', false, 'agent'),
    t('Contain the affected host', 'Contain', 'Done when a containment action is approved.', true, 'person', action('Contain')),
    t('Block the malicious indicators', 'Contain', 'Done when a blocking action is approved.', false, 'person', action('Block')),
    t('Collect forensic evidence', 'Eradicate and recover', 'Done when an evidence collection action is approved.', false, 'person', action('Collect evidence')),
    t('Notify the owner of the affected systems', 'Eradicate and recover', 'Tell the team that owns the host and the account.', true, 'team', { owner: 'Engineering' }),
    t('Lift temporary containment after remediation', 'Close out', 'Release isolation and restore access once the host is clean.', true, 'person', { after: 'Contain the affected host' }),
    t('Record the root cause and write the closing summary', 'Close out', 'Plain language, for readers outside the SOC.', true, 'person'),
  ],
  Phishing: [
    t('Retrieve the reported email and its headers', 'Triage', 'Pull the original message and routing headers.', true, 'agent'),
    t('Identify every recipient', 'Triage', 'Search mailboxes for the same message.', true, 'agent'),
    t('Did any recipient click the link?', 'Investigate', 'Settled by a claim.', true, 'agent', claim('Did any recipient click the link?')),
    t('Did any recipient enter credentials?', 'Investigate', 'Settled by a claim.', true, 'agent', claim('Did any recipient enter credentials?')),
    t('Block the sender and the URL', 'Contain', 'Done when a blocking action is approved.', true, 'person', action('Block')),
    t('Reset the passwords of affected users', 'Eradicate and recover', 'Reset and revoke sessions.', true, 'person'),
    t('Purge the message from all mailboxes', 'Eradicate and recover', 'Remove the message after approval.', false, 'automation'),
    t('Notify affected users', 'Close out', 'Tell users what happened and what to do.', false, 'person'),
    t('Record the root cause and write the closing summary', 'Close out', 'Plain language, for readers outside the SOC.', true, 'person'),
  ],
  'Account compromise': [
    t('Confirm with the user that the sign-in was not theirs', 'Triage', 'Contact the user out of band.', true, 'person'),
    t('Review sign-in and token activity', 'Triage', 'List sign-ins, token grants and devices.', true, 'agent'),
    t('Did the actor access sensitive data?', 'Investigate', 'Settled by a claim.', true, 'agent', claim('Did the actor access sensitive data?')),
    t('Check for forwarding rules and persistence', 'Investigate', 'Look for mailbox rules, app grants and new devices.', false, 'agent'),
    t('Disable the account and revoke sessions', 'Contain', 'Done when a containment action is approved.', true, 'person', action('Contain')),
    t('Reset credentials and multi-factor methods', 'Eradicate and recover', 'Reset the password and re-enroll MFA.', true, 'person'),
    t('Record the root cause and write the closing summary', 'Close out', 'Plain language, for readers outside the SOC.', true, 'person'),
  ],
  'Alert triage': [
    t('Confirm the source asset is approved', 'Triage', 'Settled by a claim about the source.', true, 'agent', claim('Is the source an approved scanner?')),
    t('Check the change window', 'Triage', 'Settled by a claim about the schedule.', true, 'agent', claim('Did the scan run inside an approved window?')),
    t('Review the grouped alerts for exploitation', 'Investigate', 'Settled by a claim about harm.', true, 'agent', claim('Did any alert involve exploitation or an intrusion?')),
    t('Record the closing reason', 'Close out', 'Plain language, for readers outside the SOC.', true, 'person'),
  ],
};

const COMMON_FIELDS: InvestigationType['fields'] = [
  { key: 'business_unit_keyword', label: 'Business unit', type: 'keyword' },
  { key: 'impact_keyword', label: 'Impact', type: 'keyword' },
  {
    key: 'data_classification_keyword',
    label: 'Data classification',
    type: 'keyword',
    options: ['Public', 'Internal', 'Confidential', 'SOX, restricted'],
  },
  { key: 'ticket_keyword', label: 'Ticket', type: 'keyword' },
];

export const DEFAULT_INVESTIGATION_TYPES: InvestigationType[] = [
  {
    name: 'Malware',
    template_id: null,
    description: 'Malicious code ran on a host.',
    fields: [...COMMON_FIELDS, { key: 'file_hash_keyword', label: 'File hash', type: 'keyword' }],
  },
  {
    name: 'Phishing',
    template_id: null,
    description: 'A reported or detected phishing message.',
    fields: [...COMMON_FIELDS, { key: 'sender_keyword', label: 'Sender', type: 'keyword' }],
  },
  {
    name: 'Account compromise',
    template_id: null,
    description: 'An account was used by someone other than its owner.',
    fields: COMMON_FIELDS,
  },
  {
    name: 'Alert triage',
    template_id: null,
    description: 'Decide whether a group of alerts needs an investigation.',
    fields: COMMON_FIELDS,
  },
];
