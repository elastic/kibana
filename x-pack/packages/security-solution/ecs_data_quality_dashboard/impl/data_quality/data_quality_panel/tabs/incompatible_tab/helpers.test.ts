/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { EcsVersion } from '@elastic/ecs';
import { euiThemeVars } from '@kbn/ui-theme';

import {
  getAllIncompatibleMarkdownComments,
  getIncompatibleColor,
  getIncompatibleFieldsMarkdownComment,
  getIncompatibleFieldsMarkdownTablesComment,
  getIncompatibleMappings,
  getIncompatibleMappingsFields,
  getIncompatibleValues,
  getIncompatibleValuesFields,
  getSameFamilyColor,
  showInvalidCallout,
} from './helpers';
import { EMPTY_STAT } from '../../../helpers';
import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
} from '../../index_properties/translations';
import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { PartitionedFieldMetadata } from '../../../types';

describe('helpers', () => {
  describe('getIncompatibleFieldsMarkdownComment', () => {
    test('it returns the expected counts and ECS version', () => {
      expect(getIncompatibleFieldsMarkdownComment(11)).toEqual(`#### 11 incompatible fields

Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.

${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${PAGES_MAY_NOT_DISPLAY_EVENTS}
${MAPPINGS_THAT_CONFLICT_WITH_ECS}
`);
    });
  });

  describe('showInvalidCallout', () => {
    test('it returns false when the `enrichedFieldMetadata` is empty', () => {
      expect(showInvalidCallout([])).toBe(false);
    });

    test('it returns true when the `enrichedFieldMetadata` is NOT empty', () => {
      expect(showInvalidCallout(mockPartitionedFieldMetadata.incompatible)).toBe(true);
    });
  });

  describe('getIncompatibleColor', () => {
    test('it returns the expected color', () => {
      expect(getIncompatibleColor()).toEqual(euiThemeVars.euiColorDanger);
    });
  });

  describe('getSameFamilyColor', () => {
    test('it returns the expected color', () => {
      expect(getSameFamilyColor()).toEqual(euiThemeVars.euiColorLightShade);
    });
  });

  describe('getIncompatibleMappings', () => {
    test('it (only) returns the mappings where type !== indexFieldType', () => {
      expect(getIncompatibleMappings(mockPartitionedFieldMetadata.incompatible)).toEqual([
        {
          dashed_name: 'host-name',
          description:
            'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
          flat_name: 'host.name',
          hasEcsMetadata: true,
          ignore_above: 1024,
          indexFieldName: 'host.name',
          indexFieldType: 'text',
          indexInvalidValues: [],
          isEcsCompliant: false,
          isInSameFamily: false,
          level: 'core',
          name: 'name',
          normalize: [],
          short: 'Name of the host.',
          type: 'keyword',
        },
        {
          dashed_name: 'source-ip',
          description: 'IP address of the source (IPv4 or IPv6).',
          flat_name: 'source.ip',
          hasEcsMetadata: true,
          indexFieldName: 'source.ip',
          indexFieldType: 'text',
          indexInvalidValues: [],
          isEcsCompliant: false,
          isInSameFamily: false,
          level: 'core',
          name: 'ip',
          normalize: [],
          short: 'IP address of the source.',
          type: 'ip',
        },
      ]);
    });

    test('it filters-out ECS complaint fields', () => {
      expect(getIncompatibleMappings(mockPartitionedFieldMetadata.ecsCompliant)).toEqual([]);
    });
  });

  describe('getIncompatibleMappingsFields', () => {
    test('it (only) returns the fields where type !== indexFieldType', () => {
      expect(getIncompatibleMappingsFields(mockPartitionedFieldMetadata.incompatible)).toEqual([
        'host.name',
        'source.ip',
      ]);
    });

    test('it filters-out ECS complaint fields', () => {
      expect(getIncompatibleMappingsFields(mockPartitionedFieldMetadata.ecsCompliant)).toEqual([]);
    });
  });

  describe('getIncompatibleValues', () => {
    test('it (only) returns the mappings with indexInvalidValues', () => {
      expect(getIncompatibleValues(mockPartitionedFieldMetadata.incompatible)).toEqual([
        {
          allowed_values: [
            {
              description:
                'Events in this category are related to the challenge and response process in which credentials are supplied and verified to allow the creation of a session. Common sources for these logs are Windows event logs and ssh logs. Visualize and analyze events in this category to look for failed logins, and other authentication-related activity.',
              expected_event_types: ['start', 'end', 'info'],
              name: 'authentication',
            },
            {
              description:
                'Events in the configuration category have to deal with creating, modifying, or deleting the settings or parameters of an application, process, or system.\nExample sources include security policy change logs, configuration auditing logging, and system integrity monitoring.',
              expected_event_types: ['access', 'change', 'creation', 'deletion', 'info'],
              name: 'configuration',
            },
            {
              description:
                'The database category denotes events and metrics relating to a data storage and retrieval system. Note that use of this category is not limited to relational database systems. Examples include event logs from MS SQL, MySQL, Elasticsearch, MongoDB, etc. Use this category to visualize and analyze database activity such as accesses and changes.',
              expected_event_types: ['access', 'change', 'info', 'error'],
              name: 'database',
            },
            {
              description:
                'Events in the driver category have to do with operating system device drivers and similar software entities such as Windows drivers, kernel extensions, kernel modules, etc.\nUse events and metrics in this category to visualize and analyze driver-related activity and status on hosts.',
              expected_event_types: ['change', 'end', 'info', 'start'],
              name: 'driver',
            },
            {
              description:
                'This category is used for events relating to email messages, email attachments, and email network or protocol activity.\nEmails events can be produced by email security gateways, mail transfer agents, email cloud service providers, or mail server monitoring applications.',
              expected_event_types: ['info'],
              name: 'email',
            },
            {
              description:
                'Relating to a set of information that has been created on, or has existed on a filesystem. Use this category of events to visualize and analyze the creation, access, and deletions of files. Events in this category can come from both host-based and network-based sources. An example source of a network-based detection of a file transfer would be the Zeek file.log.',
              expected_event_types: ['change', 'creation', 'deletion', 'info'],
              name: 'file',
            },
            {
              description:
                'Use this category to visualize and analyze information such as host inventory or host lifecycle events.\nMost of the events in this category can usually be observed from the outside, such as from a hypervisor or a control plane\'s point of view. Some can also be seen from within, such as "start" or "end".\nNote that this category is for information about hosts themselves; it is not meant to capture activity "happening on a host".',
              expected_event_types: ['access', 'change', 'end', 'info', 'start'],
              name: 'host',
            },
            {
              description:
                'Identity and access management (IAM) events relating to users, groups, and administration. Use this category to visualize and analyze IAM-related logs and data from active directory, LDAP, Okta, Duo, and other IAM systems.',
              expected_event_types: [
                'admin',
                'change',
                'creation',
                'deletion',
                'group',
                'info',
                'user',
              ],
              name: 'iam',
            },
            {
              description:
                'Relating to intrusion detections from IDS/IPS systems and functions, both network and host-based. Use this category to visualize and analyze intrusion detection alerts from systems such as Snort, Suricata, and Palo Alto threat detections.',
              expected_event_types: ['allowed', 'denied', 'info'],
              name: 'intrusion_detection',
            },
            {
              description:
                'Malware detection events and alerts. Use this category to visualize and analyze malware detections from EDR/EPP systems such as Elastic Endpoint Security, Symantec Endpoint Protection, Crowdstrike, and network IDS/IPS systems such as Suricata, or other sources of malware-related events such as Palo Alto Networks threat logs and Wildfire logs.',
              expected_event_types: ['info'],
              name: 'malware',
            },
            {
              description:
                'Relating to all network activity, including network connection lifecycle, network traffic, and essentially any event that includes an IP address. Many events containing decoded network protocol transactions fit into this category. Use events in this category to visualize or analyze counts of network ports, protocols, addresses, geolocation information, etc.',
              expected_event_types: [
                'access',
                'allowed',
                'connection',
                'denied',
                'end',
                'info',
                'protocol',
                'start',
              ],
              name: 'network',
            },
            {
              description:
                'Relating to software packages installed on hosts. Use this category to visualize and analyze inventory of software installed on various hosts, or to determine host vulnerability in the absence of vulnerability scan data.',
              expected_event_types: [
                'access',
                'change',
                'deletion',
                'info',
                'installation',
                'start',
              ],
              name: 'package',
            },
            {
              description:
                'Use this category of events to visualize and analyze process-specific information such as lifecycle events or process ancestry.',
              expected_event_types: ['access', 'change', 'end', 'info', 'start'],
              name: 'process',
            },
            {
              description:
                'Having to do with settings and assets stored in the Windows registry. Use this category to visualize and analyze activity such as registry access and modifications.',
              expected_event_types: ['access', 'change', 'creation', 'deletion'],
              name: 'registry',
            },
            {
              description:
                'The session category is applied to events and metrics regarding logical persistent connections to hosts and services. Use this category to visualize and analyze interactive or automated persistent connections between assets. Data for this category may come from Windows Event logs, SSH logs, or stateless sessions such as HTTP cookie-based sessions, etc.',
              expected_event_types: ['start', 'end', 'info'],
              name: 'session',
            },
            {
              description:
                "Use this category to visualize and analyze events describing threat actors' targets, motives, or behaviors.",
              expected_event_types: ['indicator'],
              name: 'threat',
            },
            {
              description:
                'Relating to vulnerability scan results. Use this category to analyze vulnerabilities detected by Tenable, Qualys, internal scanners, and other vulnerability management sources.',
              expected_event_types: ['info'],
              name: 'vulnerability',
            },
            {
              description:
                'Relating to web server access. Use this category to create a dashboard of web server/proxy activity from apache, IIS, nginx web servers, etc. Note: events from network observers such as Zeek http log may also be included in this category.',
              expected_event_types: ['access', 'error', 'info'],
              name: 'web',
            },
          ],
          dashed_name: 'event-category',
          description:
            'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
          example: 'authentication',
          flat_name: 'event.category',
          ignore_above: 1024,
          level: 'core',
          name: 'category',
          normalize: ['array'],
          short: 'Event category. The second categorization field in the hierarchy.',
          type: 'keyword',
          indexFieldName: 'event.category',
          indexFieldType: 'keyword',
          indexInvalidValues: [
            { count: 2, fieldName: 'an_invalid_category' },
            { count: 1, fieldName: 'theory' },
          ],
          hasEcsMetadata: true,
          isEcsCompliant: false,
          isInSameFamily: false,
        },
      ]);
    });

    test('it filters-out ECS complaint fields', () => {
      expect(getIncompatibleValues(mockPartitionedFieldMetadata.ecsCompliant)).toEqual([]);
    });
  });

  describe('getIncompatibleValuesFields', () => {
    test('it (only) returns the fields with indexInvalidValues', () => {
      expect(getIncompatibleValuesFields(mockPartitionedFieldMetadata.incompatible)).toEqual([
        'event.category',
      ]);
    });

    test('it filters-out ECS complaint fields', () => {
      expect(getIncompatibleValuesFields(mockPartitionedFieldMetadata.ecsCompliant)).toEqual([]);
    });
  });

  describe('getIncompatibleFieldsMarkdownTablesComment', () => {
    test('it returns the expected comment when the index has `incompatibleMappings` and `incompatibleValues`', () => {
      expect(
        getIncompatibleFieldsMarkdownTablesComment({
          incompatibleMappings: [
            mockPartitionedFieldMetadata.incompatible[1],
            mockPartitionedFieldMetadata.incompatible[2],
          ],
          incompatibleValues: [mockPartitionedFieldMetadata.incompatible[0]],
          indexName: 'auditbeat-custom-index-1',
        })
      ).toEqual(
        '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n'
      );
    });

    test('it returns the expected comment when the index does NOT have `incompatibleMappings` and `incompatibleValues`', () => {
      expect(
        getIncompatibleFieldsMarkdownTablesComment({
          incompatibleMappings: [], // <-- no `incompatibleMappings`
          incompatibleValues: [], // <-- no `incompatibleValues`
          indexName: 'auditbeat-custom-index-1',
        })
      ).toEqual('\n\n\n');
    });
  });

  describe('getAllIncompatibleMarkdownComments', () => {
    const defaultBytesFormat = '0,0.[0]b';
    const formatBytes = (value: number | undefined) =>
      value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

    const defaultNumberFormat = '0,0.[000]';
    const formatNumber = (value: number | undefined) =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

    test('it returns the expected collection of comments', () => {
      expect(
        getAllIncompatibleMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          isILMAvailable: true,
          indexName: 'auditbeat-custom-index-1',
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n',
        '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        `#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\n${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}\n${PAGES_MAY_NOT_DISPLAY_EVENTS}\n${MAPPINGS_THAT_CONFLICT_WITH_ECS}\n`,
        '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
      ]);
    });

    test('it returns the expected comment when `incompatible` is empty', () => {
      const emptyIncompatible: PartitionedFieldMetadata = {
        ...mockPartitionedFieldMetadata,
        incompatible: [], // <-- empty
      };

      expect(
        getAllIncompatibleMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          isILMAvailable: true,
          partitionedFieldMetadata: emptyIncompatible,
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ✅ | auditbeat-custom-index-1 | 4 (0.0%) | 0 | `unmanaged` | 27.7KB |\n\n',
        '### **Incompatible fields** `0` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        '\n\n\n',
      ]);
    });

    test('it returns the expected comment when `isILMAvailable` is false', () => {
      const emptyIncompatible: PartitionedFieldMetadata = {
        ...mockPartitionedFieldMetadata,
        incompatible: [], // <-- empty
      };

      expect(
        getAllIncompatibleMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          isILMAvailable: false,
          partitionedFieldMetadata: emptyIncompatible,
          patternDocsCount: 57410,
          sizeInBytes: undefined,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ✅ | auditbeat-custom-index-1 | 4 (0.0%) | 0 |\n\n',
        '### **Incompatible fields** `0` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        '\n\n\n',
      ]);
    });

    test('it returns the expected comment when `sizeInBytes` is not an integer', () => {
      const emptyIncompatible: PartitionedFieldMetadata = {
        ...mockPartitionedFieldMetadata,
        incompatible: [], // <-- empty
      };

      expect(
        getAllIncompatibleMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          isILMAvailable: false,
          partitionedFieldMetadata: emptyIncompatible,
          patternDocsCount: 57410,
          sizeInBytes: undefined,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ✅ | auditbeat-custom-index-1 | 4 (0.0%) | 0 |\n\n',
        '### **Incompatible fields** `0` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        '\n\n\n',
      ]);
    });
  });
});
