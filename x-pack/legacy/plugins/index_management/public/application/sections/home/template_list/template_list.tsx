/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiEmptyPrompt,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiSwitch,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { SectionError, SectionLoading, Error } from '../../../components';
import { TemplateTable } from './template_table';
import { loadIndexTemplates } from '../../../services/api';
import { Template } from '../../../../../common/types';
import { useServices } from '../../../app_context';
import {
  getTemplateEditLink,
  getTemplateListLink,
  getTemplateCloneLink,
} from '../../../services/routing';
import { UIM_TEMPLATE_LIST_LOAD } from '../../../../../common/constants';
import { TemplateDetails } from './template_details';

interface MatchParams {
  templateName?: Template['name'];
}

export const TemplateList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { templateName },
  },
  history,
}) => {
  const { uiMetricService } = useServices();
  const { error, isLoading, data: templates, sendRequest: reload } = loadIndexTemplates();

  let content;

  const [showSystemTemplates, setShowSystemTemplates] = useState<boolean>(false);

  // Filter out system index templates
  const filteredTemplates = useMemo(
    () =>
      templates ? templates.filter((template: Template) => !template.name.startsWith('.')) : [],
    [templates]
  );

  const closeTemplateDetails = () => {
    history.push(getTemplateListLink());
  };

  const editTemplate = (name: Template['name']) => {
    history.push(getTemplateEditLink(name));
  };

  const cloneTemplate = (name: Template['name']) => {
    history.push(getTemplateCloneLink(name));
  };

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackMetric('loaded', UIM_TEMPLATE_LIST_LOAD);
  }, []);

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesDescription"
          defaultMessage="Loading templates…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesErrorMessage"
            defaultMessage="Error loading templates"
          />
        }
        error={error as Error}
      />
    );
  } else if (Array.isArray(templates) && templates.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.idxMgmt.indexTemplatesList.emptyPrompt.noIndexTemplatesTitle"
              defaultMessage="You don't have any templates yet"
            />
          </h1>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else if (Array.isArray(templates) && templates.length > 0) {
    content = (
      <Fragment>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.idxMgmt.home.indexTemplatesDescription"
                  defaultMessage="Use index templates to automatically apply settings, mappings, and aliases to indices."
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              id="checkboxShowSystemIndexTemplates"
              data-test-subj="systemTemplatesSwitch"
              checked={showSystemTemplates}
              onChange={event => setShowSystemTemplates(event.target.checked)}
              label={
                <FormattedMessage
                  id="xpack.idxMgmt.indexTemplatesTable.systemIndexTemplatesSwitchLabel"
                  defaultMessage="Include system templates"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <TemplateTable
          templates={showSystemTemplates ? templates : filteredTemplates}
          reload={reload}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
        />
      </Fragment>
    );
  }

  return (
    <div data-test-subj="templateList">
      {content}
      {templateName && (
        <TemplateDetails
          templateName={templateName}
          onClose={closeTemplateDetails}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
          reload={reload}
        />
      )}
    </div>
  );
};
