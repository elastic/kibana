/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMAND_AND_CONTROL,
  DISCOVERY,
  EXECUTION,
  EXFILTRATION,
  getTacticLabel,
  getTacticMetadata,
  INITIAL_ACCESS,
  LATERAL_MOVEMENT,
  PERSISTENCE,
  PRIVILEGE_ESCALATION,
  RECONNAISSANCE,
  replaceNewlineLiterals,
  getOriginalAlertIds,
  transformInternalReplacements,
} from './attack_discovery_helpers';
import * as i18n from './translations';
import type { AttackDiscovery } from '../..';

const mockAttackDiscovery: AttackDiscovery = {
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

const expectedTactics = {
  [RECONNAISSANCE]: i18n.RECONNAISSANCE,
  [INITIAL_ACCESS]: i18n.INITIAL_ACCESS,
  [EXECUTION]: i18n.EXECUTION,
  [PERSISTENCE]: i18n.PERSISTENCE,
  [PRIVILEGE_ESCALATION]: i18n.PRIVILEGE_ESCALATION,
  [DISCOVERY]: i18n.DISCOVERY,
  [LATERAL_MOVEMENT]: i18n.LATERAL_MOVEMENT,
  [COMMAND_AND_CONTROL]: i18n.COMMAND_AND_CONTROL,
  [EXFILTRATION]: i18n.EXFILTRATION,
  unknown: 'unknown',
};

describe('helpers', () => {
  describe('getTacticLabel', () => {
    Object.entries(expectedTactics).forEach(([tactic, expectedLabel]) => {
      it(`returns the expected label for ${tactic}`, () => {
        const label = getTacticLabel(tactic);

        expect(label).toBe(expectedLabel);
      });
    });
  });

  describe('getTacticMetadata', () => {
    const expectedDetected = [
      'Initial Access',
      'Execution',
      'Persistence',
      'Privilege Escalation',
      'Credential Access',
    ];

    expectedDetected.forEach((tactic) => {
      it(`sets the detected property to true for the '${tactic}' tactic`, () => {
        const result = getTacticMetadata(mockAttackDiscovery.mitreAttackTactics);
        const metadata = result.find(({ name }) => name === tactic);

        expect(metadata?.detected).toBe(true);
      });
    });

    it('sets the detected property to false for all tactics that were not detected', () => {
      const result = getTacticMetadata(mockAttackDiscovery.mitreAttackTactics);
      const filtered = result.filter(({ name }) => !expectedDetected.includes(name));

      filtered.forEach((metadata) => {
        expect(metadata.detected).toBe(false);
      });
    });

    it('sets the expected "index" property for each tactic', () => {
      const result = getTacticMetadata(mockAttackDiscovery.mitreAttackTactics);

      result.forEach((metadata, i) => {
        expect(metadata.index).toBe(i);
      });
    });
  });

  describe('replaceNewlineLiterals', () => {
    it('replaces multiple newline literals with actual newlines', () => {
      const input = 'Multiple\\nnewline\\nliterals';
      const expected = 'Multiple\nnewline\nliterals';

      const result = replaceNewlineLiterals(input);

      expect(result).toEqual(expected);
    });

    it('does NOT replace anything if there are no newline literals', () => {
      const input = 'This is a string without newlines';
      const result = replaceNewlineLiterals(input);

      expect(result).toEqual(input);
    });
  });

  describe('getOriginalAlertIds', () => {
    const alertIds = ['alert1', 'alert2', 'alert3'];

    it('returns the original alertIds when no replacements are provided', () => {
      const result = getOriginalAlertIds({ alertIds });

      expect(result).toEqual(alertIds);
    });

    it('returns the replaced alertIds when replacements are provided', () => {
      const replacements = {
        alert1: 'replaced1',
        alert3: 'replaced3',
      };
      const expected = ['replaced1', 'alert2', 'replaced3'];

      const result = getOriginalAlertIds({ alertIds, replacements });

      expect(result).toEqual(expected);
    });

    it('returns the original alertIds when replacements are provided but no replacement is found', () => {
      const replacements = {
        alert4: 'replaced4',
        alert5: 'replaced5',
      };

      const result = getOriginalAlertIds({ alertIds, replacements });

      expect(result).toEqual(alertIds);
    });
  });

  describe('transformInternalReplacements', () => {
    it('returns empty object if empty array passed as internal replacements', () => {
      const result = transformInternalReplacements([]);

      expect(result).toEqual({});
    });

    it('returns correctly transformed replacements object', () => {
      const internalReplacements = [
        { uuid: 'e56f5c52-ebb0-4ec8-aad5-2659df2e0206', value: 'root' },
        { uuid: '99612aef-0a5a-41da-9da4-b5b5ece226a4', value: 'SRVMAC08' },
        { uuid: '6f53c297-f5cb-48c3-8aff-2e2d7a390169', value: 'Administrator' },
      ];

      const result = transformInternalReplacements(internalReplacements);

      expect(result).toEqual({
        'e56f5c52-ebb0-4ec8-aad5-2659df2e0206': 'root',
        '99612aef-0a5a-41da-9da4-b5b5ece226a4': 'SRVMAC08',
        '6f53c297-f5cb-48c3-8aff-2e2d7a390169': 'Administrator',
      });
    });
  });
});
