/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import React, { useMemo, useState } from 'react';
import {
  DEFAULT_LUCID_DREAMING_INTERVAL,
  DEFAULT_RELATIONSHIP_DREAMING_INTERVAL,
  DREAMING_DISABLED,
  MAX_DREAMING_CONNECTOR_ID_LENGTH,
  MAX_DREAMING_INTERVAL_LENGTH,
  dreamingTypesOf,
  isDreamingConfigured,
  isSplitDreaming,
  type AiIndexDreamingConfig,
} from '../../../../../common/dreaming';
import { matchingTemplateId } from '../../../../../common/dreaming_templates';
import type { AiIndexHttpItem } from '../../../../../common/http_api/ai_indices';
import {
  validateLucidDreamingInterval,
  validateRelationshipDreamingInterval,
} from '../../../../../common/validation';
import { useAiIndexDreaming } from '../../../hooks/use_ai_index_dreaming';
import { useDreamingTemplates } from '../../../hooks/use_dreaming_templates';
import { useNavigation } from '../../../hooks/use_navigation';
import { useSaveDreamingConfig } from '../../../hooks/use_save_dreaming_config';
import { getAiIndexDreamingTemplatePath } from '../../../paths';
import {
  DreamingConfigEditor,
  draftBuildsAnything,
  draftOf,
  typesOfDraft,
  type DreamingConfigDraft,
} from '../../dreaming_config/dreaming_config_editor';
import { AiIndexDetailPanelDescription } from '../ai_index_detail_panel_description';

/** Maximum height of the dreaming config JSON, in pixels, before it scrolls. */
export const DREAMING_JSON_MAX_HEIGHT = 480;

const sameTypes = (a: DreamingConfigDraft, b: DreamingConfigDraft): boolean =>
  JSON.stringify(typesOfDraft(a)) === JSON.stringify(typesOfDraft(b));

const DreamingJsonModal = ({
  dreaming,
  onClose,
}: {
  dreaming: AiIndexDreamingConfig;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onClose}
      style={{ width: 800 }}
      data-test-subj="contextAiIndexDreamingJsonModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.jsonTitle', {
            defaultMessage: 'Dreaming config',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          overflowHeight={DREAMING_JSON_MAX_HEIGHT}
          isCopyable
          data-test-subj="contextAiIndexDreamingJson"
        >
          {JSON.stringify(dreaming, null, 2)}
        </EuiCodeBlock>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} data-test-subj="contextAiIndexDreamingJsonClose">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.jsonClose', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

interface DreamingEditorProps {
  aiIndexId: string;
  dreaming: AiIndexDreamingConfig;
}

const DreamingEditor = ({ aiIndexId, dreaming }: DreamingEditorProps) => {
  const saved = useMemo(() => draftOf(dreaming), [dreaming]);
  const [edited, setEdited] = useState<DreamingConfigDraft>();
  const [editedInstructions, setEditedInstructions] = useState<string>();
  const [editedLucid, setEditedLucid] = useState<boolean>();
  const [editedLucidInterval, setEditedLucidInterval] = useState<string>();
  const [editedLucidConnector, setEditedLucidConnector] = useState<string>();
  const [editedRelationships, setEditedRelationships] = useState<boolean>();
  const [editedRelationshipInterval, setEditedRelationshipInterval] = useState<string>();
  const { saveConfig, isSaving } = useSaveDreamingConfig();
  const { templates } = useDreamingTemplates();

  const draft = edited ?? saved;
  const savedInstructions = dreaming.instructions ?? '';
  const instructions = editedInstructions ?? savedInstructions;
  const split = isSplitDreaming(dreaming);

  const savedLucid = split ? dreaming.lucid?.enabled ?? false : dreaming.enabled;
  const lucid = editedLucid ?? savedLucid;
  const savedLucidInterval = dreaming.lucid?.interval ?? DEFAULT_LUCID_DREAMING_INTERVAL;
  const lucidInterval = editedLucidInterval ?? savedLucidInterval;
  const lucidIntervalError = validateLucidDreamingInterval(lucidInterval.trim());
  const savedLucidConnector = dreaming.lucid?.connector_id ?? '';
  const lucidConnector = editedLucidConnector ?? savedLucidConnector;

  const hasRelationshipTypes = dreamingTypesOf(typesOfDraft(draft)).relationships.length > 0;
  const savedRelationships = split
    ? dreaming.relationship_dreaming?.enabled ?? false
    : dreaming.enabled;
  const relationships = (editedRelationships ?? savedRelationships) && hasRelationshipTypes;
  const savedRelationshipInterval =
    dreaming.relationship_dreaming?.interval ?? DEFAULT_RELATIONSHIP_DREAMING_INTERVAL;
  const relationshipInterval = editedRelationshipInterval ?? savedRelationshipInterval;
  const relationshipIntervalError = validateRelationshipDreamingInterval(
    relationshipInterval.trim()
  );

  const isDirty =
    (edited !== undefined && !sameTypes(edited, saved)) ||
    instructions !== savedInstructions ||
    lucid !== savedLucid ||
    lucidInterval.trim() !== savedLucidInterval ||
    lucidConnector.trim() !== savedLucidConnector ||
    relationships !== (savedRelationships && hasRelationshipTypes) ||
    relationshipInterval.trim() !== savedRelationshipInterval;
  const suggestedId = matchingTemplateId(dreaming, templates);
  const suggestedEntities = templates.find(({ id }) => id === suggestedId)?.dreaming.entities;

  const discard = () => {
    setEdited(undefined);
    setEditedInstructions(undefined);
    setEditedLucid(undefined);
    setEditedLucidInterval(undefined);
    setEditedLucidConnector(undefined);
    setEditedRelationships(undefined);
    setEditedRelationshipInterval(undefined);
  };

  const save = async () => {
    const {
      instructions: _,
      schedule: __,
      lucid: ___,
      relationship_dreaming: ____,
      ...rest
    } = dreaming;
    const trimmed = instructions.trim();
    const trimmedLucidConnector = lucidConnector.trim();
    const config: AiIndexDreamingConfig = {
      ...rest,
      enabled: false,
      ...(trimmed && { instructions: trimmed }),
      ...typesOfDraft(draft),
      lucid: {
        enabled: lucid,
        interval: lucidInterval.trim(),
        ...(trimmedLucidConnector && { connector_id: trimmedLucidConnector }),
      },
      relationship_dreaming: {
        enabled: relationships,
        interval: relationshipInterval.trim(),
      },
    };
    if (await saveConfig({ aiIndexId, config })) {
      discard();
    }
  };

  return (
    <>
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
        <EuiFlexItem grow={false} css={{ width: 320 }}>
          <EuiFormRow
            hasEmptyLabelSpace
            helpText={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.lucidHelp', {
              defaultMessage:
                'Builds facts and entities from new memories and agent rounds within minutes of their arrival.',
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.lucidLabel', {
                defaultMessage: 'Lucid Dreaming',
              })}
              checked={lucid}
              onChange={(event) => setEditedLucid(event.target.checked)}
              data-test-subj="contextAiIndexDreamingLucid"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
          <EuiFormRow
            label={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.lucidIntervalLabel', {
              defaultMessage: 'Every',
            })}
            helpText={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.dreaming.lucidIntervalHelp',
              { defaultMessage: 'From 1m to 59m.' }
            )}
            isInvalid={lucidIntervalError !== undefined}
            error={lucidIntervalError}
            isDisabled={!lucid}
          >
            <EuiFieldText
              value={lucidInterval}
              isInvalid={lucidIntervalError !== undefined}
              maxLength={MAX_DREAMING_INTERVAL_LENGTH}
              onChange={(event) => setEditedLucidInterval(event.target.value)}
              data-test-subj="contextAiIndexDreamingLucidInterval"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 280 }}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.dreaming.lucidConnectorLabel',
              { defaultMessage: 'Lucid dreaming connector ID' }
            )}
            helpText={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.dreaming.lucidConnectorHelp',
              { defaultMessage: 'Optional, such as a cheaper model. Empty: the dreaming model.' }
            )}
            isDisabled={!lucid}
          >
            <EuiFieldText
              value={lucidConnector}
              maxLength={MAX_DREAMING_CONNECTOR_ID_LENGTH}
              onChange={(event) => setEditedLucidConnector(event.target.value)}
              data-test-subj="contextAiIndexDreamingLucidConnector"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false} wrap>
        <EuiFlexItem grow={false} css={{ width: 320 }}>
          <EuiFormRow
            hasEmptyLabelSpace
            helpText={
              hasRelationshipTypes
                ? i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.relationshipsHelp', {
                    defaultMessage: 'Links the facts and entities of this AI index.',
                  })
                : i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.relationshipsNoTypesHelp',
                    { defaultMessage: 'Add a relationship type below to link entities.' }
                  )
            }
          >
            <EuiSwitch
              label={i18n.translate(
                'xpack.contextEngine.aiIndexDetail.dreaming.relationshipsLabel',
                { defaultMessage: 'Relationship Dreaming' }
              )}
              checked={relationships}
              disabled={!hasRelationshipTypes}
              onChange={(event) => setEditedRelationships(event.target.checked)}
              data-test-subj="contextAiIndexDreamingRelationships"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.dreaming.relationshipIntervalLabel',
              { defaultMessage: 'Every' }
            )}
            helpText={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.dreaming.relationshipIntervalHelp',
              { defaultMessage: 'From 1h to 30d.' }
            )}
            isInvalid={relationshipIntervalError !== undefined}
            error={relationshipIntervalError}
            isDisabled={!relationships}
          >
            <EuiFieldText
              value={relationshipInterval}
              isInvalid={relationshipIntervalError !== undefined}
              maxLength={MAX_DREAMING_INTERVAL_LENGTH}
              onChange={(event) => setEditedRelationshipInterval(event.target.value)}
              data-test-subj="contextAiIndexDreamingRelationshipInterval"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xl" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.instructionsLabel', {
          defaultMessage: 'Instructions',
        })}
        helpText={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.instructionsHelp', {
          defaultMessage:
            'What dreaming is told about this AI index: what it holds, who uses it, and what to record or skip.',
        })}
      >
        <EuiTextArea
          fullWidth
          rows={6}
          value={instructions}
          onChange={(event) => setEditedInstructions(event.target.value)}
          data-test-subj="contextAiIndexDreamingInstructions"
        />
      </EuiFormRow>
      <EuiHorizontalRule margin="xl" />
      <DreamingConfigEditor
        draft={draft}
        onChange={setEdited}
        {...(suggestedEntities && { suggestedEntities })}
      />
      {isDirty && (
        <>
          <EuiHorizontalRule margin="l" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={discard} data-test-subj="contextAiIndexDreamingDiscard">
                {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.discard', {
                  defaultMessage: 'Discard changes',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={save}
                isLoading={isSaving}
                isDisabled={
                  !draftBuildsAnything(draft) ||
                  lucidIntervalError !== undefined ||
                  relationshipIntervalError !== undefined
                }
                data-test-subj="contextAiIndexDreamingSave"
              >
                {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.save', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

interface DreamingPanelProps {
  aiIndex: AiIndexHttpItem;
}

/**
 * Shows and edits what an AI index's dreaming learns and how often it runs.
 * An AI index without dreaming set up links to the setup instead.
 */
export const DreamingPanel = ({ aiIndex }: DreamingPanelProps) => {
  const { navigateToContextEngine } = useNavigation();
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const { dreaming: savedDreaming, isLoading } = useAiIndexDreaming(aiIndex.id, { enabled: true });
  const dreaming = savedDreaming ?? DREAMING_DISABLED;
  const isSetUp = isDreamingConfigured(dreaming);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextAiIndexDreamingPanel">
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.dreaming.title"
                defaultMessage="Dreaming"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="code"
            onClick={() => setIsJsonOpen(true)}
            data-test-subj="contextAiIndexDreamingViewJson"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.viewJson', {
              defaultMessage: 'View JSON',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <AiIndexDetailPanelDescription>
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.dreaming.description"
          defaultMessage="What this AI index learns from its memories, and how often."
        />
      </AiIndexDetailPanelDescription>
      <EuiSpacer size="l" />
      {isLoading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextAiIndexDreamingLoading" />
      ) : isSetUp ? (
        <DreamingEditor key={JSON.stringify(dreaming)} aiIndexId={aiIndex.id} dreaming={dreaming} />
      ) : (
        <>
          <KbnInfoCallout
            size="s"
            title={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.notSetUpTitle', {
              defaultMessage:
                'Dreaming is not set up. Choose what this AI index learns from its memories.',
            })}
            data-test-subj="contextAiIndexDreamingNotSetUp"
          />
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            onClick={() => navigateToContextEngine(getAiIndexDreamingTemplatePath(aiIndex.id))}
            data-test-subj="contextAiIndexDreamingSetUp"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.setUp', {
              defaultMessage: 'Set up dreaming',
            })}
          </EuiButton>
        </>
      )}
      {isJsonOpen && <DreamingJsonModal dreaming={dreaming} onClose={() => setIsJsonOpen(false)} />}
    </EuiPanel>
  );
};
