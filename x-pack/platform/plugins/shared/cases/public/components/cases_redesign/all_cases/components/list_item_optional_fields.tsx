/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { CaseStatuses } from '@kbn/cases-components';

import type { CaseUI, CaseUICustomField } from '../../../../../common/ui/types';
import type { CasesColumnSelection } from '../types';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';
import { getExtendedFieldDisplayLabels } from '../../../all_cases/utils/extended_fields_column_utils';
import * as i18n from '../translations';

const DESCRIPTION_MAX_LENGTH = 100;

interface ExtendedFieldsListItemContentProps {
  extendedFields: CaseUI['extendedFields'];
  extendedFieldsLabels: CaseUI['extendedFieldsLabels'];
}

const ExtendedFieldsListItemContent: React.FC<ExtendedFieldsListItemContentProps> = ({
  extendedFields,
  extendedFieldsLabels,
}) => {
  const { euiTheme } = useEuiTheme();
  const labels = getExtendedFieldDisplayLabels(extendedFields, extendedFieldsLabels);
  const count = labels.length;

  const styles = useMemo(
    () => ({
      tooltipContent: css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
      `,
      tooltipAnchor: {
        cursor: 'default',
      },
    }),
    [euiTheme]
  );

  const tooltipContent = (
    <div css={styles.tooltipContent}>
      {labels.map((label, index) => (
        <div key={`${label}-${index}`}>{label}</div>
      ))}
    </div>
  );

  return (
    <EuiToolTip content={tooltipContent} position="top">
      <span
        css={styles.tooltipAnchor}
        data-test-subj="cases-list-item-field-extended-fields-tooltip-anchor"
        tabIndex={0}
      >
        {count}
      </span>
    </EuiToolTip>
  );
};

ExtendedFieldsListItemContent.displayName = 'ExtendedFieldsListItemContent';

interface ListItemFieldTextProps {
  label: string;
  testSubj: string;
  children: React.ReactNode;
}

const ListItemFieldText: React.FC<ListItemFieldTextProps> = ({ label, testSubj, children }) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      label: css`
        font-weight: ${euiTheme.font.weight.semiBold};
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued" data-test-subj={testSubj}>
        <span css={styles.label}>
          {label}
          {':'}
        </span>{' '}
        {children}
      </EuiText>
    </EuiFlexItem>
  );
};

ListItemFieldText.displayName = 'ListItemFieldText';

const getCustomFieldDisplayValue = (customField: CaseUICustomField): string => {
  const { value } = customField;
  if (value == null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

interface ListItemFieldContent {
  label: string;
  content: React.ReactNode;
  testSubj: string;
}

const getTagsFieldContent = (theCase: CaseUI): ListItemFieldContent | null => {
  if (theCase.tags == null || theCase.tags.length === 0) {
    return null;
  }
  return {
    label: i18n.TAGS,
    content: theCase.tags.join(', '),
    testSubj: 'cases-list-item-field-tags',
  };
};

const getExternalIncidentFieldContent = (theCase: CaseUI): ListItemFieldContent => {
  if (theCase.externalService == null) {
    return {
      label: i18n.EXTERNAL_INCIDENT,
      content: i18n.NOT_PUSHED,
      testSubj: 'cases-list-item-field-external-not-pushed',
    };
  }
  const { externalTitle, externalUrl } = theCase.externalService;
  const incidentContent =
    externalUrl != null && externalUrl !== '' ? (
      <EuiLink
        href={externalUrl}
        target="_blank"
        data-test-subj="cases-list-item-field-external-link"
      >
        {externalTitle ?? externalUrl}
      </EuiLink>
    ) : (
      externalTitle ?? theCase.externalService.externalId ?? i18n.NOT_PUSHED
    );
  return {
    label: i18n.EXTERNAL_INCIDENT,
    content: incidentContent,
    testSubj: 'cases-list-item-field-external',
  };
};

const getCustomFieldContent = (field: string, theCase: CaseUI): ListItemFieldContent | null => {
  const customField = theCase.customFields.find(
    (element: CaseUICustomField) => element.key === field && element.value != null
  );
  if (customField == null) {
    return null;
  }
  const displayValue = getCustomFieldDisplayValue(customField);
  if (displayValue === '') {
    return null;
  }
  return {
    label: field,
    content: displayValue,
    testSubj: `cases-list-item-field-${field}`,
  };
};

const listItemFieldContentGetters: Record<
  string,
  (theCase: CaseUI) => ListItemFieldContent | null
> = {
  tags: getTagsFieldContent,
  category: (theCase) =>
    theCase.category == null
      ? null
      : {
          label: i18n.CATEGORY,
          content: theCase.category,
          testSubj: 'cases-list-item-field-category',
        },
  totalComment: (theCase) => ({
    label: i18n.COMMENTS,
    content: i18n.LIST_FIELD_COMMENTS(theCase.totalComment),
    testSubj: 'cases-list-item-field-comments',
  }),
  totalAlerts: (theCase) => ({
    label: i18n.ALERTS,
    content: i18n.LIST_FIELD_ALERTS(theCase.totalAlerts ?? 0),
    testSubj: 'cases-list-item-field-alerts',
  }),
  totalEvents: (theCase) => ({
    label: i18n.EVENTS,
    content: i18n.LIST_FIELD_EVENTS(theCase.totalEvents ?? 0),
    testSubj: 'cases-list-item-field-events',
  }),
  createdAt: (theCase) => ({
    label: i18n.LIST_FIELD_CREATED,
    content: <FormattedRelativePreferenceDate value={theCase.createdAt} stripMs />,
    testSubj: 'cases-list-item-field-created-at',
  }),
  closedAt: (theCase) => {
    if (theCase.status !== CaseStatuses.closed || theCase.closedAt == null) {
      return null;
    }
    return {
      label: i18n.LIST_FIELD_CLOSED,
      content: <FormattedRelativePreferenceDate value={theCase.closedAt} stripMs={false} />,
      testSubj: 'cases-list-item-field-closed-at',
    };
  },
  connectorName: (theCase) => {
    const connectorName = theCase.externalService?.connectorName;
    if (connectorName == null) {
      return null;
    }
    return {
      label: i18n.CONNECTORS,
      content: connectorName,
      testSubj: 'cases-list-item-field-connector',
    };
  },
  externalIncident: getExternalIncidentFieldContent,
  description: (theCase) => {
    if (theCase.description == null || theCase.description === '') {
      return null;
    }
    const truncatedDescription =
      theCase.description.length > DESCRIPTION_MAX_LENGTH
        ? `${theCase.description.slice(0, DESCRIPTION_MAX_LENGTH)}…`
        : theCase.description;
    return {
      label: i18n.DESCRIPTION,
      content: truncatedDescription,
      testSubj: 'cases-list-item-field-description',
    };
  },
  extendedFields: (theCase) => {
    const labels = getExtendedFieldDisplayLabels(
      theCase.extendedFields,
      theCase.extendedFieldsLabels
    );
    if (labels.length === 0) {
      return null;
    }
    return {
      label: i18n.EXTENDED_FIELDS,
      content: (
        <ExtendedFieldsListItemContent
          extendedFields={theCase.extendedFields}
          extendedFieldsLabels={theCase.extendedFieldsLabels}
        />
      ),
      testSubj: 'cases-list-item-field-extended-fields',
    };
  },
};

const getListItemFieldContent = (field: string, theCase: CaseUI): ListItemFieldContent | null => {
  const getter = listItemFieldContentGetters[field];
  if (getter != null) {
    return getter(theCase);
  }
  return getCustomFieldContent(field, theCase);
};

interface ListItemOptionalFieldsProps {
  theCase: CaseUI;
  selectedFields: CasesColumnSelection[];
}

export const ListItemOptionalFields: React.FC<ListItemOptionalFieldsProps> = ({
  theCase,
  selectedFields,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      container: css`
        margin-top: ${euiTheme.size.s};
      `,
    }),
    [euiTheme]
  );

  const visibleFields = useMemo(
    () =>
      selectedFields.reduce<Array<ListItemFieldContent & { field: string }>>(
        (acc, { isChecked, field, name }) => {
          if (isChecked) {
            const fieldContent = getListItemFieldContent(field, theCase);
            if (fieldContent != null) {
              acc.push({ ...fieldContent, field, label: name ?? fieldContent.label });
            }
          }
          return acc;
        },
        []
      ),
    [selectedFields, theCase]
  );

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap={false}
      data-test-subj="cases-list-item-optional-fields"
      css={styles.container}
    >
      {visibleFields.map(({ field, label, content, testSubj }) => (
        <ListItemFieldText key={field} label={label} testSubj={testSubj}>
          {content}
        </ListItemFieldText>
      ))}
    </EuiFlexGroup>
  );
};

ListItemOptionalFields.displayName = 'ListItemOptionalFields';
