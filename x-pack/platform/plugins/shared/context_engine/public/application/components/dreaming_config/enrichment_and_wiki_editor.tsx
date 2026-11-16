/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import {
  DEFAULT_DREAMING_KI_TYPE_FILTERS,
  DEFAULT_ENRICHMENT_MAX_DOCUMENTS,
  DEFAULT_ENRICHMENT_REFRESH_AFTER,
  DEFAULT_WIKI_MAX_PAGES,
  DREAMING_KI_TYPE_FILTER_PATTERN,
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  MAX_DREAMING_KI_TYPE_FILTERS,
  MAX_ENRICHMENT_MAX_DOCUMENTS,
  MAX_WIKI_MAX_PAGES,
  WIKI_PAGE_KI_TYPE,
  type DreamingEnrichmentConfig,
  type DreamingWikiConfig,
} from '../../../../common/dreaming';
import { validateDreamingInterval } from '../../../../common/validation';
import { Eyebrow } from '../dreaming_template/eyebrow';
import type { DreamingConfigDraft } from './dreaming_config_editor';

/** The KI type filters to suggest: every fact and entity, and each configured type. */
export const kiTypeSuggestions = ({ facts, entities }: DreamingConfigDraft): string[] => [
  ...DEFAULT_DREAMING_KI_TYPE_FILTERS,
  ...facts.map(({ type }) => `${FACT_TYPE_PREFIX}${type}`),
  ...entities.nodes.map(({ type }) => `${ENTITY_TYPE_PREFIX}${type}`),
];

/** Whether a number field holds a whole number within bounds, or is empty. */
const isValidCount = (value: number | undefined, max: number): boolean =>
  value === undefined || (Number.isInteger(value) && value >= 1 && value <= max);

/** Whether an enrichment config can be saved as it is. */
export const isEnrichmentValid = (enrichment: DreamingEnrichmentConfig | null | undefined) =>
  !enrichment ||
  (isValidCount(enrichment.max_documents, MAX_ENRICHMENT_MAX_DOCUMENTS) &&
    (enrichment.refresh_after === undefined ||
      validateDreamingInterval(enrichment.refresh_after) === undefined));

/** Whether a wiki config can be saved as it is. */
export const isWikiValid = (wiki: DreamingWikiConfig | null | undefined) =>
  !wiki || isValidCount(wiki.max_pages, MAX_WIKI_MAX_PAGES);

const toOptions = (values: readonly string[]): Array<EuiComboBoxOptionOption<string>> =>
  values.map((value) => ({ label: value }));

const numberOrUndefined = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);

interface KiTypesFieldProps {
  label: string;
  helpText: string;
  selected: readonly string[];
  suggestions: readonly string[];
  onChange: (kiTypes: string[]) => void;
  'data-test-subj': string;
}

const KiTypesField = ({
  label,
  helpText,
  selected,
  suggestions,
  onChange,
  'data-test-subj': dataTestSubj,
}: KiTypesFieldProps) => {
  const [invalid, setInvalid] = useState(false);
  const options = toOptions([...new Set([...suggestions, ...selected])]);
  return (
    <EuiFormRow
      fullWidth
      label={label}
      helpText={helpText}
      isInvalid={invalid}
      error={i18n.translate('xpack.contextEngine.dreamingConfig.kiTypes.invalid', {
        defaultMessage: 'Use a KI type such as entity.customer, or a prefix such as fact.*.',
      })}
    >
      <EuiComboBox
        fullWidth
        aria-label={label}
        placeholder={DEFAULT_DREAMING_KI_TYPE_FILTERS.join(', ')}
        options={options}
        selectedOptions={toOptions(selected)}
        isInvalid={invalid}
        onChange={(chosen) => {
          setInvalid(false);
          onChange(chosen.map(({ label: value }) => value).slice(0, MAX_DREAMING_KI_TYPE_FILTERS));
        }}
        onCreateOption={(value) => {
          const trimmed = value.trim();
          if (!DREAMING_KI_TYPE_FILTER_PATTERN.test(trimmed)) {
            setInvalid(true);
            return false;
          }
          setInvalid(false);
          onChange([...new Set([...selected, trimmed])].slice(0, MAX_DREAMING_KI_TYPE_FILTERS));
        }}
        onSearchChange={() => setInvalid(false)}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};

const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={icon} color="subdued" aria-hidden />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <Eyebrow>{title}</Eyebrow>
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface EnrichmentEditorProps {
  enrichment: DreamingEnrichmentConfig | null | undefined;
  onChange: (enrichment: DreamingEnrichmentConfig) => void;
  kiTypeSuggestions: readonly string[];
  /** Whether the AI index has a source to search. */
  hasSources: boolean;
}

/** Edits how dreaming improves existing knowledge items with what the sources say. */
export const EnrichmentEditor = ({
  enrichment,
  onChange,
  kiTypeSuggestions: suggestions,
  hasSources,
}: EnrichmentEditorProps) => {
  const current: DreamingEnrichmentConfig = enrichment ?? { enabled: false };
  const update = (next: Partial<DreamingEnrichmentConfig>) => onChange({ ...current, ...next });
  const refreshAfter = current.refresh_after ?? '';
  const refreshAfterError =
    refreshAfter.trim() === '' ? undefined : validateDreamingInterval(refreshAfter.trim());
  const maxDocumentsInvalid = !isValidCount(current.max_documents, MAX_ENRICHMENT_MAX_DOCUMENTS);

  return (
    <section data-test-subj="contextDreamingConfigEnrichment">
      <SectionHeader
        icon="sparkles"
        title={i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.title', {
          defaultMessage: 'Improve knowledge items',
        })}
      />
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.description', {
            defaultMessage:
              'Dreaming picks the knowledge items worth improving, searches the sources of this AI index for what they lack, and adds what it finds, citing where it came from. It searches the indices of ES|QL sources and runs only the read-only actions of connector sources.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.enabled', {
          defaultMessage: 'Improve knowledge items from the sources',
        })}
        checked={current.enabled}
        onChange={(event) => update({ enabled: event.target.checked })}
        data-test-subj="contextDreamingConfigEnrichmentEnabled"
      />
      {current.enabled && (
        <>
          {!hasSources && (
            <>
              <EuiSpacer size="m" />
              <KbnWarningCallout
                size="s"
                title={i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.noSources', {
                  defaultMessage:
                    'This AI index has no sources to search. Add an ES|QL or connector source for enrichment to run.',
                })}
                data-test-subj="contextDreamingConfigEnrichmentNoSources"
              />
            </>
          )}
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.selectionLabel', {
              defaultMessage: 'Which items to improve',
            })}
            helpText={i18n.translate(
              'xpack.contextEngine.dreamingConfig.enrichment.selectionHelp',
              {
                defaultMessage:
                  'Tells the model which items are worth improving, for example "customers with no account manager or contract tier".',
              }
            )}
          >
            <EuiTextArea
              fullWidth
              rows={3}
              value={current.selection ?? ''}
              onChange={(event) => update({ selection: event.target.value })}
              data-test-subj="contextDreamingConfigEnrichmentSelection"
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.contextEngine.dreamingConfig.enrichment.improvementLabel',
              { defaultMessage: 'What to improve them in' }
            )}
            helpText={i18n.translate(
              'xpack.contextEngine.dreamingConfig.enrichment.improvementHelp',
              {
                defaultMessage:
                  'What to look for in the sources and add, for example "the current tier, renewal date and open escalations".',
              }
            )}
          >
            <EuiTextArea
              fullWidth
              rows={3}
              value={current.improvement ?? ''}
              onChange={(event) => update({ improvement: event.target.value })}
              data-test-subj="contextDreamingConfigEnrichmentImprovement"
            />
          </EuiFormRow>
          <KiTypesField
            label={i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.kiTypesLabel', {
              defaultMessage: 'Knowledge item types',
            })}
            helpText={i18n.translate('xpack.contextEngine.dreamingConfig.enrichment.kiTypesHelp', {
              defaultMessage: 'The types of item to improve. Empty: every fact and entity.',
            })}
            selected={current.ki_types ?? []}
            suggestions={suggestions}
            onChange={(kiTypes) => update({ ki_types: kiTypes })}
            data-test-subj="contextDreamingConfigEnrichmentKiTypes"
          />
          <EuiFlexGroup gutterSize="l" responsive={false} wrap>
            <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.contextEngine.dreamingConfig.enrichment.maxDocumentsLabel',
                  { defaultMessage: 'Items per run' }
                )}
                helpText={i18n.translate(
                  'xpack.contextEngine.dreamingConfig.enrichment.maxDocumentsHelp',
                  {
                    defaultMessage: 'At most {max}.',
                    values: { max: MAX_ENRICHMENT_MAX_DOCUMENTS },
                  }
                )}
                isInvalid={maxDocumentsInvalid}
              >
                <EuiFieldNumber
                  min={1}
                  max={MAX_ENRICHMENT_MAX_DOCUMENTS}
                  placeholder={String(DEFAULT_ENRICHMENT_MAX_DOCUMENTS)}
                  value={current.max_documents ?? ''}
                  isInvalid={maxDocumentsInvalid}
                  onChange={(event) =>
                    update({ max_documents: numberOrUndefined(event.target.value) })
                  }
                  data-test-subj="contextDreamingConfigEnrichmentMaxDocuments"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.contextEngine.dreamingConfig.enrichment.refreshAfterLabel',
                  { defaultMessage: 'Revisit after' }
                )}
                helpText={i18n.translate(
                  'xpack.contextEngine.dreamingConfig.enrichment.refreshAfterHelp',
                  {
                    defaultMessage:
                      'How long an improved item that has not changed is left alone, for example 7d.',
                  }
                )}
                isInvalid={refreshAfterError !== undefined}
                error={refreshAfterError}
              >
                <EuiFieldText
                  placeholder={DEFAULT_ENRICHMENT_REFRESH_AFTER}
                  value={refreshAfter}
                  isInvalid={refreshAfterError !== undefined}
                  onChange={(event) => update({ refresh_after: event.target.value })}
                  data-test-subj="contextDreamingConfigEnrichmentRefreshAfter"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </section>
  );
};

interface WikiEditorProps {
  wiki: DreamingWikiConfig | null | undefined;
  onChange: (wiki: DreamingWikiConfig) => void;
  kiTypeSuggestions: readonly string[];
}

/** Edits how dreaming builds wiki pages that tie related knowledge items together. */
export const WikiEditor = ({ wiki, onChange, kiTypeSuggestions: suggestions }: WikiEditorProps) => {
  const current: DreamingWikiConfig = wiki ?? { enabled: false };
  const update = (next: Partial<DreamingWikiConfig>) => onChange({ ...current, ...next });
  const maxPagesInvalid = !isValidCount(current.max_pages, MAX_WIKI_MAX_PAGES);

  return (
    <section data-test-subj="contextDreamingConfigWiki">
      <SectionHeader
        icon="documents"
        title={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.title', {
          defaultMessage: 'Wiki pages',
        })}
      />
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.dreamingConfig.wiki.description', {
            defaultMessage:
              'Dreaming writes overview pages that tie the knowledge items about one topic together, such as everything known about a customer, and adds what the sources of this AI index say about it. Each page is stored as a {type} knowledge item, visible to the people who can see its items.',
            values: { type: WIKI_PAGE_KI_TYPE },
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.enabled', {
          defaultMessage: 'Build wiki pages',
        })}
        checked={current.enabled}
        onChange={(event) => update({ enabled: event.target.checked })}
        data-test-subj="contextDreamingConfigWikiEnabled"
      />
      {current.enabled && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.instructionsLabel', {
              defaultMessage: 'Which pages to build',
            })}
            helpText={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.instructionsHelp', {
              defaultMessage:
                'The topics to write pages about and how to write them, for example "one page per customer, with its products, open issues and contacts".',
            })}
          >
            <EuiTextArea
              fullWidth
              rows={3}
              value={current.instructions ?? ''}
              onChange={(event) => update({ instructions: event.target.value })}
              data-test-subj="contextDreamingConfigWikiInstructions"
            />
          </EuiFormRow>
          <KiTypesField
            label={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.kiTypesLabel', {
              defaultMessage: 'Knowledge item types',
            })}
            helpText={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.kiTypesHelp', {
              defaultMessage:
                'The types of item pages are built from. Empty: every fact and entity.',
            })}
            selected={current.ki_types ?? []}
            suggestions={suggestions}
            onChange={(kiTypes) => update({ ki_types: kiTypes })}
            data-test-subj="contextDreamingConfigWikiKiTypes"
          />
          <EuiFlexGroup gutterSize="l" alignItems="flexEnd" responsive={false} wrap>
            <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
              <EuiFormRow
                label={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.maxPagesLabel', {
                  defaultMessage: 'Pages per run',
                })}
                helpText={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.maxPagesHelp', {
                  defaultMessage: 'At most {max}.',
                  values: { max: MAX_WIKI_MAX_PAGES },
                })}
                isInvalid={maxPagesInvalid}
              >
                <EuiFieldNumber
                  min={1}
                  max={MAX_WIKI_MAX_PAGES}
                  placeholder={String(DEFAULT_WIKI_MAX_PAGES)}
                  value={current.max_pages ?? ''}
                  isInvalid={maxPagesInvalid}
                  onChange={(event) => update({ max_pages: numberOrUndefined(event.target.value) })}
                  data-test-subj="contextDreamingConfigWikiMaxPages"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiSwitch
                  label={i18n.translate('xpack.contextEngine.dreamingConfig.wiki.research', {
                    defaultMessage: 'Add what the sources say',
                  })}
                  checked={current.research ?? true}
                  onChange={(event) => update({ research: event.target.checked })}
                  data-test-subj="contextDreamingConfigWikiResearch"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </section>
  );
};

/** An enrichment config as saved: prompts trimmed, and empty fields left out. */
export const normalizedEnrichment = (
  enrichment: DreamingEnrichmentConfig
): DreamingEnrichmentConfig => {
  const selection = enrichment.selection?.trim();
  const improvement = enrichment.improvement?.trim();
  const refreshAfter = enrichment.refresh_after?.trim();
  return {
    enabled: enrichment.enabled,
    ...(selection && { selection }),
    ...(improvement && { improvement }),
    ...(enrichment.ki_types && enrichment.ki_types.length > 0 && { ki_types: enrichment.ki_types }),
    ...(enrichment.max_documents !== undefined && { max_documents: enrichment.max_documents }),
    ...(refreshAfter && { refresh_after: refreshAfter }),
  };
};

/** A wiki config as saved: instructions trimmed, and empty fields left out. */
export const normalizedWiki = (wiki: DreamingWikiConfig): DreamingWikiConfig => {
  const instructions = wiki.instructions?.trim();
  return {
    enabled: wiki.enabled,
    ...(instructions && { instructions }),
    ...(wiki.ki_types && wiki.ki_types.length > 0 && { ki_types: wiki.ki_types }),
    ...(wiki.max_pages !== undefined && { max_pages: wiki.max_pages }),
    ...(wiki.research === false && { research: false }),
  };
};
