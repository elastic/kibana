/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiLink, EuiFormRow, EuiComboBox, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import type { DocLinksStart } from '@kbn/core/public';
import type { ProcessorType } from '@kbn/streamlang';
import { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { getDefaultFormStateByType } from '../../../utils';
import type { ProcessorFormState } from '../../../types';
import { configDrivenProcessors } from './config_driven';
import {
  useGetStreamEnrichmentState,
  useInteractiveModeSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import { selectPreviewRecords } from '../../../state_management/simulation_state_machine/selectors';
import { useStreamEnrichmentSelector } from '../../../state_management/stream_enrichment_state_machine';
import { isStepUnderEdit } from '../../../state_management/steps_state_machine';

interface TAvailableProcessor {
  type: ProcessorType;
  inputDisplay: string;
  getDocUrl: (docLinks: DocLinksStart) => React.ReactNode;
}

type TAvailableProcessors = Record<ProcessorType, TAvailableProcessor>;

export const ProcessorTypeSelector = ({ disabled = false }: { disabled?: boolean }) => {
  const { core } = useKibana();
  const getEnrichmentState = useGetStreamEnrichmentState();

  const { reset } = useFormContext();
  const { field, fieldState } = useController<ProcessorFormState, 'action'>({
    name: 'action',
    rules: { required: true },
  });

  const processorType = useWatch<{ action: ProcessorType }>({ name: 'action' });
  const isWired = useStreamEnrichmentSelector((snapshot) =>
    Streams.WiredStream.GetResponse.is(snapshot.context.definition)
  );

  const isWithinWhereBlock = useInteractiveModeSelector((state) => {
    const stepUnderEdit = state.context.stepRefs.find((stepRef) =>
      isStepUnderEdit(stepRef.getSnapshot())
    );
    return stepUnderEdit ? stepUnderEdit.getSnapshot().context.step.parentId !== null : false;
  });

  const grokCollection = useStreamEnrichmentSelector((state) => state.context.grokCollection);

  // To make it possible to clear the selection to enter a new value,
  // keep track of local empty state. As soon as field.value is set, switch back to highlighting
  // the selected option.
  const [localEmpty, setLocalEmpty] = React.useState(false);

  useEffect(() => {
    if (field.value) {
      setLocalEmpty(false);
    }
  }, [field.value]);

  const handleChange = (selectedOptions: Array<EuiComboBoxOptionOption<ProcessorType>>) => {
    if (selectedOptions.length === 0) {
      setLocalEmpty(true);
      return;
    }
    const type = selectedOptions[0].value!;
    const formState = getDefaultFormStateByType(
      type,
      selectPreviewRecords(getEnrichmentState().context.simulatorRef.getSnapshot().context),
      { grokCollection }
    );
    reset(formState);
  };

  const groupedOptions = useMemo(
    () => getProcessorTypeSelectorOptions(isWired, isWithinWhereBlock),
    [isWired, isWithinWhereBlock]
  );

  const selectedOptions = useMemo(() => {
    const allOptions = groupedOptions.flatMap((group) => group.options);
    const selected = allOptions.find((opt) => opt.value === field.value);
    return selected ? [selected] : [];
  }, [field.value, groupedOptions]);

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.typeSelectorLabel',
        { defaultMessage: 'Processor' }
      )}
      helpText={getProcessorDescription(core.docLinks, isWired, isWithinWhereBlock)(processorType)}
    >
      <EuiComboBox
        data-test-subj="streamsAppProcessorTypeSelector"
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.typeSelectorLabel',
          { defaultMessage: 'Processor' }
        )}
        isDisabled={disabled}
        options={groupedOptions}
        isInvalid={fieldState.invalid}
        selectedOptions={localEmpty ? [] : selectedOptions}
        onChange={handleChange}
        fullWidth
        singleSelection={{ asPlainText: true }}
        compressed={true}
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.typeSelectorPlaceholder',
          { defaultMessage: 'Grok, Dissect ...' }
        )}
      />
    </EuiFormRow>
  );
};

const getAvailableProcessors: (
  isWired: boolean,
  isWithinWhereBlock?: boolean
) => Partial<TAvailableProcessors> = (isWired, isWithinWhereBlock = false) => ({
  date: {
    type: 'date',
    inputDisplay: 'Date',
    getDocUrl: () => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dateHelpText"
        defaultMessage="Converts a date to a document timestamp."
      />
    ),
  },
  dissect: {
    type: 'dissect',
    inputDisplay: 'Dissect',
    getDocUrl: (docLinks: DocLinksStart) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectHelpText"
        defaultMessage="Uses {dissectLink} patterns to extract matches from a field."
        values={{
          dissectLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsDissectLink"
              external
              target="_blank"
              href={docLinks.links.ingest.dissect}
            >
              {i18n.translate('xpack.streams.availableProcessors.dissectLinkLabel', {
                defaultMessage: 'dissect',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  grok: {
    type: 'grok',
    inputDisplay: 'Grok',
    getDocUrl: (docLinks: DocLinksStart) => (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.processor.grokHelpText"
        defaultMessage="Uses {grokLink} expressions to extract matches from a field."
        values={{
          grokLink: (
            <EuiLink
              data-test-subj="streamsAppAvailableProcessorsGrokLink"
              external
              target="_blank"
              href={docLinks.links.ingest.grok}
            >
              {i18n.translate('xpack.streams.availableProcessors.grokLinkLabel', {
                defaultMessage: 'grok',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  convert: {
    type: 'convert' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertInputDisplay',
      {
        defaultMessage: 'Convert',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setHelpText"
          defaultMessage="{convertLink}. For example, you can convert a string to an long."
          values={{
            convertLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsConvertLink"
                external
                target="_blank"
                href={docLinks.links.ingest.convert}
              >
                {i18n.translate('xpack.streams.availableProcessors.setLinkLabel', {
                  defaultMessage: 'Converts a field to a different data type',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  set: {
    type: 'set' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.setInputDisplay',
      {
        defaultMessage: 'Set',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.setHelpText"
          defaultMessage="{setLink} If the field already exists, its value will be replaced with the provided one."
          values={{
            setLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsSetLink"
                external
                target="_blank"
                href={docLinks.links.ingest.set}
              >
                {i18n.translate('xpack.streams.availableProcessors.setLinkLabel', {
                  defaultMessage: 'Sets one field and associates it with the specified value.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  replace: {
    type: 'replace' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceInputDisplay',
      {
        defaultMessage: 'Replace',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.replaceHelpText"
          defaultMessage="{replaceLink} that match a regular expression pattern with a replacement string."
          values={{
            replaceLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsReplaceLink"
                external
                target="_blank"
                href={docLinks.links.ingest.gsub}
              >
                {i18n.translate('xpack.streams.availableProcessors.replaceLinkLabel', {
                  defaultMessage: 'Replaces parts of a string field.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  drop_document: {
    type: 'drop_document' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.dropInputDisplay',
      {
        defaultMessage: 'Drop document',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dropHelpText"
          defaultMessage="{dropLink} This is useful to prevent the document from getting indexed based on some condition."
          values={{
            dropLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsDropLink"
                external
                target="_blank"
                href={docLinks.links.ingest.drop}
              >
                {i18n.translate('xpack.streams.availableProcessors.dropLinkLabel', {
                  defaultMessage: 'Drops the document without raising any errors.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  math: {
    type: 'math' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.mathInputDisplay',
      {
        defaultMessage: 'Math',
      }
    ),
    getDocUrl: () => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.mathHelpText"
          defaultMessage="Evaluates arithmetic or logical expressions. Reference fields directly (for example, {example}). The result is written to the target field."
          values={{
            example: (
              <>
                <EuiCode>bytes / duration </EuiCode>
              </>
            ),
          }}
        />
      );
    },
  },
  uppercase: {
    type: 'uppercase' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.uppercaseInputDisplay',
      {
        defaultMessage: 'Uppercase',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uppercaseHelpText"
          defaultMessage="{uppercaseLink}. If the field is an array of strings, all members of the array will be converted."
          values={{
            uppercaseLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsUppercaseLink"
                external
                target="_blank"
                href={docLinks.links.ingest.uppercase}
              >
                {i18n.translate('xpack.streams.availableProcessors.uppercaseLinkLabel', {
                  defaultMessage: 'Converts a string to its uppercase equivalent.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  lowercase: {
    type: 'lowercase' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.lowercaseInputDisplay',
      {
        defaultMessage: 'Lowercase',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.lowercaseHelpText"
          defaultMessage="{lowercaseLink}. If the field is an array of strings, all members of the array will be converted."
          values={{
            lowercaseLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsLowercaseLink"
                external
                target="_blank"
                href={docLinks.links.ingest.lowercase}
              >
                {i18n.translate('xpack.streams.availableProcessors.lowercaseLinkLabel', {
                  defaultMessage: 'Converts a string to its lowercase equivalent.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  trim: {
    type: 'trim' as const,
    inputDisplay: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.trimInputDisplay',
      {
        defaultMessage: 'Trim',
      }
    ),
    getDocUrl: (docLinks: DocLinksStart) => {
      return (
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.trimHelpText"
          defaultMessage="{trimLink} If the field is an array of strings, all members of the array will be trimmed."
          values={{
            trimLink: (
              <EuiLink
                data-test-subj="streamsAppAvailableProcessorsTrimLink"
                external
                target="_blank"
                href={docLinks.links.ingest.trim}
              >
                {i18n.translate('xpack.streams.availableProcessors.trimLinkLabel', {
                  defaultMessage: 'Trims whitespace from field.',
                })}
              </EuiLink>
            ),
          }}
        />
      );
    },
  },
  ...configDrivenProcessors,
  ...(isWired
    ? {}
    : {
        manual_ingest_pipeline: {
          type: 'manual_ingest_pipeline',
          inputDisplay: 'Manual pipeline configuration',
          getDocUrl: () => (
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.processor.manualIngestPipelineHelpText"
              defaultMessage="Specify an array of ingest pipeline processors using JSON."
            />
          ),
        },
      }),
  // Remove remove_by_prefix from available processors when inside a where block
  ...(isWithinWhereBlock
    ? {
        remove_by_prefix: undefined,
      }
    : {}),
});

const PROCESSOR_GROUP_MAP: Record<
  ProcessorType,
  'remove' | 'extract' | 'convert' | 'set' | 'other'
> = {
  remove: 'remove',
  remove_by_prefix: 'remove',
  drop_document: 'remove',
  grok: 'extract',
  dissect: 'extract',
  convert: 'convert',
  date: 'convert',
  replace: 'convert',
  append: 'set',
  set: 'set',
  rename: 'set',
  math: 'set',
  manual_ingest_pipeline: 'other',
  uppercase: 'set',
  lowercase: 'set',
  trim: 'set',
  join: 'set',
};

const getProcessorDescription =
  (docLinks: DocLinksStart, isWired: boolean, isWithinWhereBlock?: boolean) =>
  (type: ProcessorType) => {
    return getAvailableProcessors(isWired, isWithinWhereBlock)[type]?.getDocUrl(docLinks);
  };

const getProcessorTypeSelectorOptions = (
  isWired: boolean,
  isWithinWhereBlock?: boolean
): Array<{
  label: string;
  options: Array<EuiComboBoxOptionOption<ProcessorType>>;
}> => {
  const availableProcessors = getAvailableProcessors(isWired, isWithinWhereBlock);

  // Define processor groups
  const groups = {
    remove: [] as Array<EuiComboBoxOptionOption<ProcessorType>>,
    extract: [] as Array<EuiComboBoxOptionOption<ProcessorType>>,
    convert: [] as Array<EuiComboBoxOptionOption<ProcessorType>>,
    set: [] as Array<EuiComboBoxOptionOption<ProcessorType>>,
    other: [] as Array<EuiComboBoxOptionOption<ProcessorType>>,
  };

  // Categorize processors into groups using lookup map
  Object.values(availableProcessors)
    .filter((processor) => processor !== undefined)
    .forEach(({ type, inputDisplay }) => {
      const option = { label: inputDisplay, value: type };
      const groupKey = PROCESSOR_GROUP_MAP[type] || 'other';
      groups[groupKey].push(option);
    });

  const result: Array<{
    label: string;
    options: Array<EuiComboBoxOptionOption<ProcessorType>>;
  }> = [];

  if (groups.remove.length > 0) {
    result.push({
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.removeGroup',
        { defaultMessage: 'Remove' }
      ),
      options: groups.remove,
    });
  }

  if (groups.extract.length > 0) {
    result.push({
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.extractGroup',
        { defaultMessage: 'Extract' }
      ),
      options: groups.extract,
    });
  }

  if (groups.convert.length > 0) {
    result.push({
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertGroup',
        { defaultMessage: 'Convert' }
      ),
      options: groups.convert,
    });
  }

  if (groups.set.length > 0) {
    result.push({
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.setGroup',
        { defaultMessage: 'Set' }
      ),
      options: groups.set,
    });
  }

  if (groups.other.length > 0) {
    result.push({
      label: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.otherGroup',
        { defaultMessage: 'Other' }
      ),
      options: groups.other,
    });
  }

  return result;
};
