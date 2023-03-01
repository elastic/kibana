/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_NEW_CASE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.addToNewCaseButton',
  {
    defaultMessage: 'Add to new case',
  }
);

export const ALL_FIELDS = i18n.translate('ecsDataQualityDashboard.indexProperties.allFieldsLabel', {
  defaultMessage: 'All fields',
});

export const ALL_CALLOUT = (version: string) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.allCallout', {
    values: { version },
    defaultMessage:
      "All mappings for the fields in this index, including fields that comply with the Elastic Common Schema (ECS), version {version}, and fields that don't",
  });

export const ALL_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.allCalloutTitle', {
    values: { fieldCount },
    defaultMessage:
      'All {fieldCount} {fieldCount, plural, =1 {field mapping} other {field mappings}}',
  });

export const ALL_EMPTY = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.allCalloutEmptyContent',
  {
    defaultMessage: 'This index does not contain any mappings',
  }
);

export const ALL_EMPTY_TITLE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.allCalloutEmptyTitle',
  {
    defaultMessage: 'No mappings',
  }
);

export const ALL_FIELDS_TABLE_TITLE = (indexName: string) =>
  i18n.translate('ecsDataQualityDashboard.allTab.allFieldsTableTitle', {
    values: { indexName },
    defaultMessage: 'All fields - {indexName}',
  });

export const SUMMARY_MARKDOWN_TITLE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.summaryMarkdownTitle',
  {
    defaultMessage: 'Data quality',
  }
);

export const SUMMARY_MARKDOWN_DESCRIPTION = ({
  ecsFieldReferenceUrl,
  ecsReferenceUrl,
  indexName,
  mappingUrl,
  version,
}: {
  ecsFieldReferenceUrl: string;
  ecsReferenceUrl: string;
  indexName: string;
  mappingUrl: string;
  version: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.summaryMarkdownDescription', {
    values: { ecsFieldReferenceUrl, ecsReferenceUrl, indexName, mappingUrl, version },
    defaultMessage:
      'The `{indexName}` index has [mappings]({mappingUrl}) or field values that are different than the [Elastic Common Schema]({ecsReferenceUrl}) (ECS), version `{version}` [definitions]({ecsFieldReferenceUrl}).',
  });

export const COPY_TO_CLIPBOARD = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.copyToClipboardButton',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const CUSTOM_FIELDS_TABLE_TITLE = (indexName: string) =>
  i18n.translate('ecsDataQualityDashboard.customTab.customFieldsTableTitle', {
    values: { indexName },
    defaultMessage: 'Custom fields - {indexName}',
  });

export const CUSTOM_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.custonDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Custom detection engine rules work',
  }
);

export const DOCS = i18n.translate('ecsDataQualityDashboard.indexProperties.docsLabel', {
  defaultMessage: 'Docs',
});

export const ECS_COMPLIANT_FIELDS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.ecsCompliantFieldsLabel',
  {
    defaultMessage: 'ECS compliant fields',
  }
);

export const ECS_COMPLIANT_CALLOUT = ({
  fieldCount,
  version,
}: {
  fieldCount: number;
  version: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.ecsCompliantCallout', {
    values: { fieldCount, version },
    defaultMessage:
      'The {fieldCount, plural, =1 {index mapping type and document values for this field comply} other {index mapping types and document values of these fields comply}} with the Elastic Common Schema (ECS), version {version}',
  });

export const ECS_COMPLIANT_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.ecsCompliantCalloutTitle', {
    values: { fieldCount },
    defaultMessage: '{fieldCount} ECS compliant {fieldCount, plural, =1 {field} other {fields}}',
  });

export const ECS_COMPLIANT_EMPTY = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.ecsCompliantEmptyContent',
  {
    defaultMessage:
      'None of the field mappings in this index comply with the Elastic Common Schema (ECS). The index must (at least) contain an @timestamp date field.',
  }
);

export const ECS_VERSION_MARKDOWN_COMMENT = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.ecsVersionMarkdownComment',
  {
    defaultMessage: 'Elastic Common Schema (ECS) version',
  }
);

export const INDEX = i18n.translate('ecsDataQualityDashboard.indexProperties.indexMarkdown', {
  defaultMessage: 'Index',
});

export const ECS_COMPLIANT_EMPTY_TITLE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.ecsCompliantEmptyTitle',
  {
    defaultMessage: 'No ECS compliant Mappings',
  }
);

export const ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.ecsCompliantMappingsAreFullySupportedMessage',
  {
    defaultMessage: '✅ ECS compliant mappings and field values are fully supported',
  }
);

export const ERROR_LOADING_MAPPINGS_TITLE = i18n.translate(
  'ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMappingsTitle',
  {
    defaultMessage: 'Unable to load index mappings',
  }
);

export const ERROR_LOADING_MAPPINGS_BODY = (error: string) =>
  i18n.translate('ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMappingsBody', {
    values: { error },
    defaultMessage: 'There was a problem loading mappings: {error}',
  });

export const ERROR_LOADING_UNALLOWED_VALUES_BODY = (error: string) =>
  i18n.translate('ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingUnallowedValuesBody', {
    values: { error },
    defaultMessage: 'There was a problem loading unallowed values: {error}',
  });

export const ERROR_LOADING_UNALLOWED_VALUES_TITLE = i18n.translate(
  'ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingUnallowedValuesTitle',
  {
    defaultMessage: 'Unable to load unallowed values',
  }
);

export const ECS_COMPLIANT_FIELDS_TABLE_TITLE = (indexName: string) =>
  i18n.translate('ecsDataQualityDashboard.customTab.ecsComplaintFieldsTableTitle', {
    values: { indexName },
    defaultMessage: 'ECS complaint fields - {indexName}',
  });

export const LOADING_MAPPINGS = i18n.translate(
  'ecsDataQualityDashboard.emptyLoadingPrompt.loadingMappingsPrompt',
  {
    defaultMessage: 'Loading mappings',
  }
);

export const LOADING_UNALLOWED_VALUES = i18n.translate(
  'ecsDataQualityDashboard.emptyLoadingPrompt.loadingUnallowedValuesPrompt',
  {
    defaultMessage: 'Loading unallowed values',
  }
);

export const SUMMARY = i18n.translate('ecsDataQualityDashboard.indexProperties.summaryTab', {
  defaultMessage: 'Summary',
});

export const MISSING_TIMESTAMP_CALLOUT = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.missingTimestampCallout',
  {
    defaultMessage:
      'Consider adding an @timestamp (date) field mapping to this index, as required by the Elastic Common Schema (ECS), because:',
  }
);

export const MISSING_TIMESTAMP_CALLOUT_TITLE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.missingTimestampCalloutTitle',
  {
    defaultMessage: 'Missing an @timestamp (date) field mapping for this index',
  }
);

export const CUSTOM_FIELDS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.customFieldsLabel',
  {
    defaultMessage: 'Custom fields',
  }
);

export const CUSTOM_CALLOUT = ({ fieldCount, version }: { fieldCount: number; version: string }) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.customCallout', {
    values: { fieldCount, version },
    defaultMessage:
      '{fieldCount, plural, =1 {This field is not} other {These fields are not}} defined by the Elastic Common Schema (ECS), version {version}.',
  });

export const CUSTOM_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.customCalloutTitle', {
    values: { fieldCount },
    defaultMessage:
      '{fieldCount} Custom {fieldCount, plural, =1 {field mapping} other {field mappings}}',
  });

export const CUSTOM_EMPTY = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.customEmptyContent',
  {
    defaultMessage: 'All the field mappings in this index are defined by the Elastic Common Schema',
  }
);

export const CUSTOM_EMPTY_TITLE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.customEmptyTitle',
  {
    defaultMessage: 'All field mappings defined by ECS',
  }
);

export const INCOMPATIBLE_FIELDS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.incompatibleFieldsTab',
  {
    defaultMessage: 'Incompatible fields',
  }
);

export const INCOMPATIBLE_CALLOUT = ({
  fieldCount,
  version,
}: {
  fieldCount: number;
  version: string;
}) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.incompatibleCallout', {
    values: { version },
    defaultMessage:
      "Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version {version}.",
  });

export const INCOMPATIBLE_FIELDS_WITH = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.incompatibleCallout.incompatibleFieldsWithLabel',
  {
    defaultMessage:
      'Incompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.',
  }
);

export const WHEN_AN_INCOMPATIBLE_FIELD = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.incompatibleCallout.whenAnIncompatibleFieldLabel',
  {
    defaultMessage: 'When an incompatible field is not in the same family:',
  }
);

export const INCOMPATIBLE_CALLOUT_TITLE = ({
  fieldCount,
  fieldsInSameFamily,
}: {
  fieldCount: number;
  fieldsInSameFamily: number;
}) =>
  i18n.translate('ecsDataQualityDashboard.indexProperties.incompatibleCalloutTitle', {
    values: { fieldCount, fieldsInSameFamily },
    defaultMessage:
      '{fieldCount} incompatible {fieldCount, plural, =1 {field} other {fields}}, {fieldsInSameFamily} {fieldsInSameFamily, plural, =1 {field} other {fields}} with {fieldsInSameFamily, plural, =1 {a mapping} other {mappings}} in the same family',
  });

export const INCOMPATIBLE_EMPTY = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.incompatibleEmptyContent',
  {
    defaultMessage:
      'All of the field mappings and document values in this index are compliant with the Elastic Common Schema (ECS).',
  }
);

export const INCOMPATIBLE_EMPTY_TITLE = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.incompatibleEmptyTitle',
  {
    defaultMessage: 'All field mappings and values are ECS compliant',
  }
);

export const DETECTION_ENGINE_RULES_WILL_WORK = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.detectionEngineRulesWillWorkMessage',
  {
    defaultMessage: '✅ Detection engine rules will work for these fields',
  }
);

export const DETECTION_ENGINE_RULES_MAY_NOT_MATCH = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.detectionEngineRulesWontWorkMessage',
  {
    defaultMessage:
      '❌ Detection engine rules referencing these fields may not match them correctly',
  }
);

export const OTHER_APP_CAPABILITIES_WORK_PROPERLY = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.otherAppCapabilitiesWorkProperlyMessage',
  {
    defaultMessage: '✅ Other app capabilities work properly',
  }
);

export const PAGES_DISPLAY_EVENTS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.pagesDisplayEventsMessage',
  {
    defaultMessage: '✅ Pages display events and fields correctly',
  }
);

export const PAGES_MAY_NOT_DISPLAY_FIELDS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.pagesMayNotDisplayFieldsMessage',
  {
    defaultMessage: '🌕 Some pages and features may not display these fields',
  }
);

export const PAGES_MAY_NOT_DISPLAY_EVENTS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.pagesMayNotDisplayEventsMessage',
  {
    defaultMessage:
      '❌ Pages may not display some events or fields due to unexpected field mappings or values',
  }
);

export const PRE_BUILT_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.preBuiltDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Pre-built detection engine rules work',
  }
);

export const ECS_IS_A_PERMISSIVE_SCHEMA = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.ecsIsAPermissiveSchemaMessage',
  {
    defaultMessage:
      'ECS is a permissive schema. If your events have additional data that cannot be mapped to ECS, you can simply add them to your events, using custom field names.',
  }
);

export const SOMETIMES_INDICES_CREATED_BY_OLDER = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.sometimesIndicesCreatedByOlderDescription',
  {
    defaultMessage:
      'Sometimes, indices created by older integrations will have mappings or values that were, but are no longer compliant.',
  }
);

export const MAPPINGS_THAT_CONFLICT_WITH_ECS = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.mappingThatConflictWithEcsMessage',
  {
    defaultMessage: "❌ Mappings or field values that don't comply with ECS are not supported",
  }
);

export const UNKNOWN = i18n.translate(
  'ecsDataQualityDashboard.indexProperties.unknownCategoryLabel',
  {
    defaultMessage: 'Unknown',
  }
);
