/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { debounce } from 'lodash';
import { useMlApi, useMlKibana } from '../../../contexts/kibana';
import { isValidIndexName } from '../../../../../common/util/es_utils';
import { createKibanaDataView, checkIndexExists } from '../retry_create_data_view';
import { useToastNotificationService } from '../../../services/toast_notification_service';

const destIndexEmpty = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.destIndexEmpty',
  {
    defaultMessage: 'Enter a valid destination index',
  }
);

const destIndexExists = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.destIndexExists',
  {
    defaultMessage: 'An index with this name already exists.',
  }
);

const destIndexInvalid = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.destIndexInvalid',
  {
    defaultMessage:
      'Index name cannot be empty. It must be lowercase. It cannot start with -, _, +. It cannot include \\\\, /, *, ?, ", <, >, |, space character, comma, #, :',
  }
);

interface Props {
  pipelineName: string;
  sourceIndex?: string;
}

export const ReindexWithPipeline: FC<Props> = ({ pipelineName, sourceIndex }) => {
  const [selectedIndex, setSelectedIndex] = useState<EuiComboBoxOptionOption[]>(
    sourceIndex ? [{ label: sourceIndex }] : []
  );
  const [options, setOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [destinationIndex, setDestinationIndex] = useState<string>('');
  const [destinationIndexExists, setDestinationIndexExists] = useState<boolean>(false);
  const [destinationIndexInvalidMessage, setDestinationIndexInvalidMessage] = useState<
    string | undefined
  >(destIndexEmpty);
  const [reindexingTaskId, setReindexingTaskId] = useState<estypes.TaskId | undefined>();
  const [discoverLink, setDiscoverLink] = useState<string | undefined>();
  const [shouldCreateDataView, setShouldCreateDataView] = useState<boolean>(false);
  const [canReindex, setCanReindex] = useState<boolean>(false);
  const [canReindexError, setCanReindexError] = useState<string | undefined>();

  const {
    services: {
      application: { capabilities },
      share,
      data,
      docLinks: { links },
    },
  } = useMlKibana();
  const mlApi = useMlApi();
  const { getIndices, reindexWithPipeline, hasPrivileges } = mlApi;

  const { displayErrorToast } = useToastNotificationService();

  const canCreateDataView = useMemo(
    () =>
      capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true,
    [capabilities]
  );
  const id = useMemo(() => htmlIdGenerator()(), []);

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const showDiscoverLink = useMemo(
    () => capabilities.discover_v2?.show !== undefined && discoverLocator !== undefined,
    [capabilities.discover_v2?.show, discoverLocator]
  );

  const generateDiscoverUrl = useCallback(
    async (dataViewId: string) => {
      if (discoverLocator !== undefined) {
        const url = await discoverLocator.getRedirectUrl({
          indexPatternId: dataViewId,
          timeRange: data.query.timefilter.timefilter.getTime(),
          filters: data.query.filterManager.getFilters(),
        });

        return url;
      }
    },
    [discoverLocator, data]
  );

  const debouncedIndexCheck = debounce(async () => {
    const checkResp = await checkIndexExists(destinationIndex, mlApi);
    if (checkResp.errorMessage !== undefined) {
      displayErrorToast(
        checkResp.errorMessage,
        i18n.translate(
          'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.errorCheckingIndexExists',
          {
            defaultMessage: 'An error occurred getting the existing index names',
          }
        )
      );
    } else if (checkResp.resp) {
      setDestinationIndexExists(checkResp.resp[destinationIndex].exists);
    }
  }, 400);

  const onReindex = async () => {
    try {
      const srcIndex = selectedIndex[0].label;
      const result = await reindexWithPipeline(pipelineName, srcIndex, destinationIndex);
      setReindexingTaskId(result.task);
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate(
          'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexErrorMessage',
          {
            defaultMessage: 'An error occurred reindexing',
          }
        )
      );
    }
  };

  const onChange = (selected: EuiComboBoxOptionOption[]) => {
    setSelectedIndex(selected);
  };

  const onDestIndexNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDestinationIndex(e.target.value);
    if (e.target.value === '') {
      setDestinationIndexInvalidMessage(destIndexEmpty);
    } else if (!isValidIndexName(e.target.value)) {
      setDestinationIndexInvalidMessage(destIndexInvalid);
    } else {
      setDestinationIndexInvalidMessage(undefined);
    }
  };

  useEffect(
    function canReindexCheck() {
      async function checkPrivileges() {
        try {
          const privilege = await hasPrivileges({
            index: [
              {
                names: [selectedIndex[0].label], // uses wildcard
                privileges: ['read'],
              },
              {
                names: [destinationIndex], // uses wildcard
                privileges: ['write'],
              },
            ],
          });

          setCanReindex(
            privilege.hasPrivileges === undefined ||
              privilege.hasPrivileges.has_all_requested === true
          );
        } catch (e) {
          const error = extractErrorMessage(e);
          const errorMessage = i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.indexPrivilegeErrorMessage',
            {
              defaultMessage: 'User does not have required permissions to reindex {index}. {error}',
              values: { error, index: selectedIndex[0].label },
            }
          );
          setCanReindexError(errorMessage);
        }
      }
      if (hasPrivileges !== undefined && selectedIndex.length) {
        checkPrivileges();
      }
    },
    [hasPrivileges, sourceIndex, destinationIndex, selectedIndex]
  );

  useEffect(
    function checkDestIndexExists() {
      if (destinationIndex !== undefined && destinationIndex !== '') {
        debouncedIndexCheck();
      }
    },
    [destinationIndex, debouncedIndexCheck]
  );

  useEffect(
    function getIndexOptions() {
      async function getAllIndices() {
        const indices = await getIndices();
        const indexOptions = indices.map((index) => ({ label: index.name }));
        setOptions(indexOptions);
      }
      getAllIndices();
    },
    [getIndices]
  );

  useEffect(
    function createDiscoverLink() {
      async function createDataView() {
        const dataViewCreationResult = await createKibanaDataView(
          destinationIndex,
          data.dataViews,
          mlApi
        );
        if (
          dataViewCreationResult?.success === true &&
          dataViewCreationResult?.dataViewId &&
          showDiscoverLink
        ) {
          const url = await generateDiscoverUrl(dataViewCreationResult.dataViewId);
          setDiscoverLink(url);
        }
      }
      if (reindexingTaskId !== undefined && shouldCreateDataView === true) {
        createDataView();
      }
    },
    // Skip ml API services from deps check
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      reindexingTaskId,
      destinationIndex,
      data?.dataViews,
      generateDiscoverUrl,
      showDiscoverLink,
      shouldCreateDataView,
    ]
  );

  const reindexButton = (
    <EuiButton
      onClick={onReindex}
      disabled={
        selectedIndex.length === 0 ||
        (destinationIndexInvalidMessage !== undefined && selectedIndex.length > 0) ||
        !canReindex ||
        destinationIndexExists
      }
      size="s"
    >
      <FormattedMessage
        id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexLabel"
        defaultMessage="Reindex"
      />
    </EuiButton>
  );

  return (
    <EuiPanel hasShadow={false} hasBorder={false}>
      {reindexingTaskId === undefined ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiText>
                  <h4>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexingTitle"
                      defaultMessage="Reindex with pipeline"
                    />
                  </h4>
                </EuiText>
                <EuiText size="xs" color="GrayText">
                  <EuiLink
                    href={links.upgradeAssistant.reindexWithPipeline}
                    target="_blank"
                    external
                  >
                    {'Learn more.'}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexingTooltip"
                      defaultMessage="Reindex data from the source index to a destination index using the new pipeline, which adds inference results to each document."
                    />
                  }
                  position="right"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.selectIndexLabel"
                  defaultMessage="Select index to reindex"
                />
              }
            >
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={options}
                selectedOptions={selectedIndex}
                onChange={onChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.destinationIndexLabel"
                  defaultMessage="Destination index name"
                />
              }
              isInvalid={destinationIndexInvalidMessage !== undefined || destinationIndexExists}
              error={
                destinationIndexInvalidMessage || destinationIndexExists
                  ? destinationIndexInvalidMessage ?? destIndexExists
                  : undefined
              }
            >
              <EuiFieldText
                value={destinationIndex}
                onChange={onDestIndexNameChange}
                aria-label={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.destIndexFieldAriaLabel',
                  {
                    defaultMessage: 'Enter the name of the destination index',
                  }
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          {canCreateDataView ? (
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id={id}
                label={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.createDataViewLabel',
                  {
                    defaultMessage: 'Create data view',
                  }
                )}
                checked={shouldCreateDataView}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setShouldCreateDataView(e.target.checked)
                }
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <div>
              {canReindexError ? (
                <EuiToolTip position="top" content={canReindexError}>
                  {reindexButton}
                </EuiToolTip>
              ) : (
                reindexButton
              )}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiCallOut
          data-test-subj="mlTrainedModelsInferenceReviewAndCreateStepSuccessCallout"
          title={i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexStartedMessage',
            {
              defaultMessage: 'Reindexing of {sourceIndex} to {destinationIndex} has started.',
              values: { sourceIndex: selectedIndex[0].label, destinationIndex },
            }
          )}
          color="success"
          iconType="check"
        >
          <p>
            <FormattedMessage
              id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexingTaskIdMessage"
              defaultMessage="Reindexing task id {taskId} can be used to monitor the progress via the {tasksApi}."
              values={{
                taskId: reindexingTaskId,
                tasksApi: (
                  <EuiLink href={`${links.apis.tasks}`} target="_blank" external>
                    {'task management API'}
                  </EuiLink>
                ),
              }}
            />
            {discoverLink !== undefined ? (
              <FormattedMessage
                id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.reindexedlinkToDiscover"
                defaultMessage=" View {destIndexInDiscover} in Discover."
                values={{
                  destIndexInDiscover: (
                    <EuiLink href={`${discoverLink}`} target="_blank" external>
                      {destinationIndex}
                    </EuiLink>
                  ),
                }}
              />
            ) : null}
          </p>
        </EuiCallOut>
      )}
    </EuiPanel>
  );
};
