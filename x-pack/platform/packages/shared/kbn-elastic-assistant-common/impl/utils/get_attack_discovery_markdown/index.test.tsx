/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAttackChainMarkdown,
  getAttackDiscoveryMarkdown,
  getAttackDiscoveryMarkdownFields,
  getMarkdownFields,
  getMarkdownWithOriginalValues,
} from '.';
import { AttackDiscovery } from '../../schemas';

export const mockAttackDiscovery: AttackDiscovery = {
  alertIds: [
    '639801cdb10a93610be4a91fe0eac94cd3d4d292cf0c2a6d7b3674d7f7390357',
    'bdcf649846dc3ed0ca66537e1c1dc62035a35a208ba4d9853a93e9be4b0dbea3',
    'cdbd13134bbd371cd045e5f89970b21ab866a9c3817b2aaba8d8e247ca88b823',
    '58571e1653b4201c4f35d49b6eb4023fc0219d5885ff7c385a9253a692a77104',
    '06fcb3563de7dad14137c0bb4e5bae17948c808b8a3b8c60d9ec209a865b20ed',
    '8bd3fcaeca5698ee26df402c8bc40df0404d34a278bc0bd9355910c8c92a4aee',
    '59ff4efa1a03b0d1cb5c0640f5702555faf5c88d273616c1b6e22dcfc47ac46c',
    'f352f8ca14a12062cde77ff2b099202bf74f4a7d757c2ac75ac63690b2f2f91a',
  ],
  detailsMarkdown:
    'The following attack progression appears to have occurred on the host {{ host.name 5e454c38-439c-4096-8478-0a55511c76e3 }} involving the user {{ user.name 3bdc7952-a334-4d95-8092-cd176546e18a }}:\n\n- A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation.\n- This application spawned child processes to copy a malicious file named "unix1" to the user\'s home directory and make it executable.\n- The malicious "unix1" file was then executed, attempting to access the user\'s login keychain and potentially exfiltrate credentials.\n- The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing.\n\nThis appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.',
  entitySummaryMarkdown:
    'Suspicious activity involving the host {{ host.name 5e454c38-439c-4096-8478-0a55511c76e3 }} and user {{ user.name 3bdc7952-a334-4d95-8092-cd176546e18a }}.',
  id: 'e6d1f8ef-7c1d-42d6-ba6a-11610bab72b1',
  mitreAttackTactics: [
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Credential Access',
  ],
  summaryMarkdown:
    'A multi-stage malware attack was detected on {{ host.name 5e454c38-439c-4096-8478-0a55511c76e3 }} involving {{ user.name 3bdc7952-a334-4d95-8092-cd176546e18a }}. A suspicious application delivered malware, attempted credential theft, and established persistence.',
  timestamp: '2024-06-25T21:14:40.098Z',
  title: 'Malware Attack With Credential Theft Attempt',
};

describe('getAttackDiscoveryMarkdown', () => {
  describe('getMarkdownFields', () => {
    it('replaces markdown fields with formatted values', () => {
      const markdown = 'This is a {{ field1 value1 }} and {{ field2 value2 }}.';
      const expected = 'This is a `value1` and `value2`.';

      const result = getMarkdownFields(markdown);

      expect(result).toBe(expected);
    });

    it('handles multiple occurrences of markdown fields', () => {
      const markdown =
        'This is a {{ field1 value1 }} and {{ field2 value2 }}. Also, {{ field1 value3 }}.';
      const expected = 'This is a `value1` and `value2`. Also, `value3`.';

      const result = getMarkdownFields(markdown);

      expect(result).toBe(expected);
    });

    it('handles markdown fields with no spaces around them', () => {
      const markdown = 'This is a {{field1 value1}} and {{field2 value2}}.';
      const expected = 'This is a `value1` and `value2`.';

      const result = getMarkdownFields(markdown);

      expect(result).toBe(expected);
    });

    it('handles empty markdown', () => {
      const markdown = '';
      const expected = '';

      const result = getMarkdownFields(markdown);

      expect(result).toBe(expected);
    });

    it('handles whitespaces within the value correctly', () => {
      const markdown = 'This is a {{ field1 value one }} and {{ field2 value two }}.';
      const expected = 'This is a `value one` and `value two`.';

      const result = getMarkdownFields(markdown);

      expect(result).toBe(expected);
    });
  });

  describe('getAttackChainMarkdown', () => {
    it('returns an empty string when no tactics are detected', () => {
      const noTactics = {
        ...mockAttackDiscovery,
        mitreAttackTactics: [],
      };

      const result = getAttackChainMarkdown(noTactics);

      expect(result).toBe('');
    });

    it('returns the expected attack chain markdown when a subset of tactics are detected', () => {
      const result = getAttackChainMarkdown(mockAttackDiscovery);

      expect(result).toBe(`### Attack Chain
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Credential Access
`);
    });

    it('returns the expected attack chain markdown when the full set of tactics are detected', () => {
      const allTactics = {
        ...mockAttackDiscovery,
        mitreAttackTactics: [
          'Reconnaissance',
          'Resource Development',
          'Initial Access',
          'Execution',
          'Persistence',
          'Privilege Escalation',
          'Defense Evasion',
          'Credential Access',
          'Discovery',
          'Lateral Movement',
          'Collection',
          'Command and Control',
          'Exfiltration',
          'Impact',
        ],
      };

      const result = getAttackChainMarkdown(allTactics);

      expect(result).toBe(`### Attack Chain
- Reconnaissance
- Resource Development
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Collection
- Command & Control
- Exfiltration
- Impact
`);
    });
  });

  describe('getMarkdownWithOriginalValues', () => {
    const markdown = mockAttackDiscovery.summaryMarkdown;

    it('returns the same markdown when no replacements are provided', () => {
      const result = getMarkdownWithOriginalValues({ markdown });

      expect(result).toBe(markdown);
    });

    it('replaces the UUIDs with the original values when replacements are provided ', () => {
      const replacements = {
        '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
        '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
      };
      const expected =
        'A multi-stage malware attack was detected on {{ host.name foo.hostname }} involving {{ user.name bar.username }}. A suspicious application delivered malware, attempted credential theft, and established persistence.';

      const result = getMarkdownWithOriginalValues({ markdown, replacements });

      expect(result).toBe(expected);
    });

    it('only replaces values when there are corresponding entries in the replacements', () => {
      // The UUID '3bdc7952-a334-4d95-8092-cd176546e18a' is not in the replacements:
      const replacements = {
        '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
      };

      const expected =
        'A multi-stage malware attack was detected on {{ host.name foo.hostname }} involving {{ user.name 3bdc7952-a334-4d95-8092-cd176546e18a }}. A suspicious application delivered malware, attempted credential theft, and established persistence.';

      const result = getMarkdownWithOriginalValues({ markdown, replacements });

      expect(result).toBe(expected);
    });
  });

  describe('getAttackDiscoveryMarkdown', () => {
    it('returns the expected markdown when replacements are NOT provided', () => {
      const expectedMarkdown = `## Malware Attack With Credential Theft Attempt

Suspicious activity involving the host \`5e454c38-439c-4096-8478-0a55511c76e3\` and user \`3bdc7952-a334-4d95-8092-cd176546e18a\`.

### Summary
A multi-stage malware attack was detected on \`5e454c38-439c-4096-8478-0a55511c76e3\` involving \`3bdc7952-a334-4d95-8092-cd176546e18a\`. A suspicious application delivered malware, attempted credential theft, and established persistence.

### Details
The following attack progression appears to have occurred on the host \`5e454c38-439c-4096-8478-0a55511c76e3\` involving the user \`3bdc7952-a334-4d95-8092-cd176546e18a\`:

- A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation.
- This application spawned child processes to copy a malicious file named "unix1" to the user's home directory and make it executable.
- The malicious "unix1" file was then executed, attempting to access the user's login keychain and potentially exfiltrate credentials.
- The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing.

This appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.

### Attack Chain
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Credential Access

`;

      const markdown = getAttackDiscoveryMarkdown({ attackDiscovery: mockAttackDiscovery });

      expect(markdown).toBe(expectedMarkdown);
    });

    it('returns the expected markdown when replacements are provided', () => {
      const replacements = {
        '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
        '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
      };

      const expectedMarkdown = `## Malware Attack With Credential Theft Attempt

Suspicious activity involving the host \`foo.hostname\` and user \`bar.username\`.

### Summary
A multi-stage malware attack was detected on \`foo.hostname\` involving \`bar.username\`. A suspicious application delivered malware, attempted credential theft, and established persistence.

### Details
The following attack progression appears to have occurred on the host \`foo.hostname\` involving the user \`bar.username\`:

- A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation.
- This application spawned child processes to copy a malicious file named "unix1" to the user's home directory and make it executable.
- The malicious "unix1" file was then executed, attempting to access the user's login keychain and potentially exfiltrate credentials.
- The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing.

This appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.

### Attack Chain
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Credential Access

`;

      const markdown = getAttackDiscoveryMarkdown({
        attackDiscovery: mockAttackDiscovery,
        replacements,
      });

      expect(markdown).toBe(expectedMarkdown);
    });
  });

  describe('getAttackDiscoveryMarkdownFields', () => {
    it('returns all markdown fields with replacements applied', () => {
      const replacements = {
        '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
        '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
      };
      const fields = getAttackDiscoveryMarkdownFields({
        attackDiscovery: mockAttackDiscovery,
        replacements,
      });
      expect(fields.detailsMarkdown).toBe(
        'The following attack progression appears to have occurred on the host `foo.hostname` involving the user `bar.username`:\n\n- A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation.\n- This application spawned child processes to copy a malicious file named "unix1" to the user\'s home directory and make it executable.\n- The malicious "unix1" file was then executed, attempting to access the user\'s login keychain and potentially exfiltrate credentials.\n- The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing.\n\nThis appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.'
      );
      expect(fields.entitySummaryMarkdown).toBe(
        'Suspicious activity involving the host `foo.hostname` and user `bar.username`.'
      );
      expect(fields.summaryMarkdown).toBe(
        'A multi-stage malware attack was detected on `foo.hostname` involving `bar.username`. A suspicious application delivered malware, attempted credential theft, and established persistence.'
      );
      expect(fields.title).toBe('Malware Attack With Credential Theft Attempt');
    });

    it('returns all markdown fields with original placeholders if no replacements', () => {
      const fields = getAttackDiscoveryMarkdownFields({
        attackDiscovery: mockAttackDiscovery,
      });
      expect(fields.detailsMarkdown).toBe(
        'The following attack progression appears to have occurred on the host `5e454c38-439c-4096-8478-0a55511c76e3` involving the user `3bdc7952-a334-4d95-8092-cd176546e18a`:\n\n- A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation.\n- This application spawned child processes to copy a malicious file named "unix1" to the user\'s home directory and make it executable.\n- The malicious "unix1" file was then executed, attempting to access the user\'s login keychain and potentially exfiltrate credentials.\n- The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing.\n\nThis appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.'
      );
      expect(fields.entitySummaryMarkdown).toBe(
        'Suspicious activity involving the host `5e454c38-439c-4096-8478-0a55511c76e3` and user `3bdc7952-a334-4d95-8092-cd176546e18a`.'
      );
      expect(fields.summaryMarkdown).toBe(
        'A multi-stage malware attack was detected on `5e454c38-439c-4096-8478-0a55511c76e3` involving `3bdc7952-a334-4d95-8092-cd176546e18a`. A suspicious application delivered malware, attempted credential theft, and established persistence.'
      );
      expect(fields.title).toBe('Malware Attack With Credential Theft Attempt');
    });

    it('returns empty strings for missing optional fields', () => {
      const minimalDiscovery = {
        ...mockAttackDiscovery,
        entitySummaryMarkdown: undefined,
        detailsMarkdown: '',
        summaryMarkdown: '',
      };
      const fields = getAttackDiscoveryMarkdownFields({
        attackDiscovery: minimalDiscovery,
      });
      expect(fields.entitySummaryMarkdown).toBe('');
      expect(fields.detailsMarkdown).toBe('');
      expect(fields.summaryMarkdown).toBe('');
      expect(fields.title).toBe('Malware Attack With Credential Theft Attempt');
    });
  });
});
