/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs';
import type { EuiMarkdownEditorUiPlugin, EuiMarkdownAstNodePosition } from '@elastic/eui';
import {
  EuiCodeBlock,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiMarkdownContext,
  EuiModalFooter,
  EuiButton,
  EuiFlexGroup,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useContext, useMemo, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocation } from 'react-router-dom';
import { css } from '@emotion/react';

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { TypedLensByValueInput, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { TimeRange } from '@kbn/data-plugin/common';
import { LENS_SO_TYPE } from '../../../../../common/constants/attachments';
import { useCasesConfig, useKibana, useToasts } from '../../../../common/lib/kibana';
import { useMarkdownEditorPluginClickedEBT } from '../../../../analytics/use_markdown_editor_ebt';
import { DRAFT_COMMENT_STORAGE_ID, ID } from './constants';
import { CommentEditorContext } from '../../context';
import { useLensDraftComment } from './use_lens_draft_comment';
import {
  FAILED_TO_LOAD_VISUALIZATION,
  SEARCH_INPUT_HELP_TEXT,
  SEARCH_INPUT_HELP_TEXT_WITH_ATTACH_HINT,
  VISUALIZATION,
} from './translations';
import { useIsMainApplication } from '../../../../common/hooks';
import { convertToAbsoluteTimeRange } from '../../../attachments/lens/actions/convert_to_absolute_time_range';
import { getPendingLensAttach } from '../../../attachments/lens/lens_return/storage';
import { toLensAttributes } from './to_lens_attributes';

const DEFAULT_TIMERANGE: TimeRange = {
  from: 'now-7d',
  to: 'now',
  mode: 'relative',
};

interface LensIncomingSerializedState {
  attributes?: TypedLensByValueInput['attributes'];
  ref_id?: string;
}
type LensIncomingEmbeddablePackage = EmbeddablePackageState<LensIncomingSerializedState>;

const getLensIncomingTimeRange = (timefilter: {
  getTime: () => TimeRange;
}): TimeRange | undefined => {
  const lensTime = timefilter.getTime();
  if (!lensTime?.from || !lensTime?.to) {
    return undefined;
  }

  return {
    from: lensTime.from,
    to: lensTime.to,
    mode: [lensTime.from, lensTime.to].join('').includes('now')
      ? ('relative' as const)
      : ('absolute' as const),
  };
};

interface LensContentManagementGetResult {
  item?: {
    attributes?: Record<string, unknown>;
    references?: Array<{ type: string; id: string; name: string }>;
  };
}

const fetchLensAttributesForComment = async ({
  id,
  contentManagement,
}: {
  id: string;
  contentManagement: ContentManagementPublicStart;
}): Promise<Record<string, unknown> | undefined> => {
  try {
    const result = (await contentManagement.client.get({
      contentTypeId: LENS_SO_TYPE,
      id,
    })) as LensContentManagementGetResult | undefined;
    const attributes = result?.item?.attributes;
    if (!attributes) {
      return undefined;
    }

    const references = result?.item?.references ?? [];
    return references.length > 0 ? { ...attributes, references } : attributes;
  } catch {
    return undefined;
  }
};

type LensEuiMarkdownEditorUiPlugin = EuiMarkdownEditorUiPlugin<{
  timeRange: TypedLensByValueInput['timeRange'];
  position: EuiMarkdownAstNodePosition;
  attributes: TypedLensByValueInput['attributes'];
}>;

const LensEditorComponent: LensEuiMarkdownEditorUiPlugin['editor'] = ({
  node,
  onCancel,
  onSave,
}) => {
  const location = useLocation();
  const {
    application: { currentAppId$ },
    embeddable,
    lens,
    storage,
    contentManagement,
    uiSettings,
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
  } = useKibana().services;
  const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);
  const { draftComment, clearDraftComment } = useLensDraftComment();
  const { attachmentsEnabled } = useCasesConfig();
  const toasts = useToasts();
  const commentEditorContext = useContext(CommentEditorContext);
  const markdownContext = useContext(EuiMarkdownContext);
  const isMainApplication = useIsMainApplication();
  const { euiTheme } = useEuiTheme();
  const trackMarkdownEditorPluginClicked = useMarkdownEditorPluginClickedEBT();
  const hasReportedRef = useRef(false);

  // Reports when the Lens plugin is opened via the markdown toolbar (new insert),
  // not when editing an existing Lens block (`node` is defined).
  useEffect(() => {
    if (!node && !hasReportedRef.current) {
      hasReportedRef.current = true;
      trackMarkdownEditorPluginClicked('lens');
    }
  }, [node, trackMarkdownEditorPluginClicked]);

  const handleClose = useCallback(() => {
    if (currentAppId) {
      embeddable?.getStateTransfer().getIncomingEmbeddablePackage(currentAppId, true);
      clearDraftComment();
    }
    onCancel();
  }, [clearDraftComment, currentAppId, embeddable, onCancel]);

  const handleAdd = useCallback(
    (_attributes: Record<string, unknown>, timeRange?: TimeRange) => {
      const attributes = toLensAttributes(_attributes);

      onSave(
        `!{${ID}${JSON.stringify({
          timeRange: convertToAbsoluteTimeRange(timeRange),
          attributes,
        })}}`,
        {
          block: true,
        }
      );

      handleClose();
    },
    [handleClose, onSave]
  );

  const handleUpdate = useCallback(
    (
      _attributes: Record<string, unknown>,
      timeRange: TimeRange | undefined,
      position: EuiMarkdownAstNodePosition
    ) => {
      const attributes = toLensAttributes(_attributes);

      markdownContext.replaceNode(
        position,
        `!{${ID}${JSON.stringify({
          timeRange: convertToAbsoluteTimeRange(timeRange),
          attributes,
        })}}`
      );

      handleClose();
    },
    [handleClose, markdownContext]
  );

  const originatingPath = useMemo(
    () =>
      isMainApplication
        ? `/insightsAndAlerting/cases${location.pathname}${location.search}`
        : `${location.pathname}${location.search}`,
    [isMainApplication, location.pathname, location.search]
  );

  const handleCreateInLensClick = useCallback(() => {
    storage.set(DRAFT_COMMENT_STORAGE_ID, {
      commentId: commentEditorContext?.editorId,
      comment: commentEditorContext?.value,
      position: node?.position,
      caseTitle: commentEditorContext?.caseTitle,
      caseTags: commentEditorContext?.caseTags,
    });

    lens?.navigateToPrefilledEditor(undefined, {
      originatingApp: currentAppId,
      originatingPath,
    });
  }, [
    storage,
    commentEditorContext?.editorId,
    commentEditorContext?.value,
    commentEditorContext?.caseTitle,
    commentEditorContext?.caseTags,
    node?.position,
    lens,
    currentAppId,
    originatingPath,
  ]);

  const handleEditInLensClick = useCallback(
    (lensAttributes?: Record<string, unknown>, timeRange: TimeRange = DEFAULT_TIMERANGE) => {
      storage.set(DRAFT_COMMENT_STORAGE_ID, {
        commentId: commentEditorContext?.editorId,
        comment: commentEditorContext?.value,
        position: node?.position,
        caseTitle: commentEditorContext?.caseTitle,
        caseTags: commentEditorContext?.caseTags,
      });

      lens?.navigateToPrefilledEditor(
        lensAttributes || node?.attributes
          ? {
              id: '',
              time_range: timeRange,
              attributes: (lensAttributes || node?.attributes) as LensSavedObjectAttributes,
            }
          : undefined,
        {
          originatingApp: currentAppId,
          originatingPath,
        }
      );
    },
    [
      storage,
      commentEditorContext?.editorId,
      commentEditorContext?.value,
      commentEditorContext?.caseTitle,
      commentEditorContext?.caseTags,
      node?.position,
      node?.attributes,
      lens,
      currentAppId,
      originatingPath,
    ]
  );

  const handleChooseLensSO = useCallback(
    (
      savedObjectId: string,
      savedObjectType: string,
      fullName: string,
      savedObject: SavedObjectCommon
    ) => {
      handleAdd(
        {
          ...savedObject.attributes,
          references: savedObject.references,
        } as Record<string, unknown>,
        getLensIncomingTimeRange(timefilter)
      );
    },
    [handleAdd, timefilter]
  );

  const savedObjectMetaData = useMemo(
    () => [
      {
        type: 'lens',
        getIconForSavedObject: () => 'lensApp',
        name: i18n.translate(
          'xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.savedObjectType.lens',
          {
            defaultMessage: 'Lens',
          }
        ),
        includeFields: ['*'],
      },
    ],
    []
  );

  useEffect(() => {
    if (node?.attributes && currentAppId) {
      handleEditInLensClick(node.attributes, node.timeRange);
    }
  }, [handleEditInLensClick, node, currentAppId]);

  useEffect(() => {
    const getCurrentAppId = async () => {
      const appId = await currentAppId$.pipe(first()).toPromise();
      setCurrentAppId(appId);
    };
    getCurrentAppId();
  }, [currentAppId$]);

  useEffect(() => {
    if (!currentAppId) {
      return;
    }
    // A pending SO-attach marker means the incoming Lens package belongs to
    // the "Open in Lens -> Save and return" round trip, not the markdown flow.
    // Leave the package for the SO-attach consumer to claim.
    if (getPendingLensAttach(storage)) {
      return;
    }
    // Wait until the draft has loaded from storage before consuming the
    // incoming package. `useLensDraftComment` hydrates `draftComment`
    // asynchronously; if we drained the package here on the first render
    // (before the draft resolved), the second run — the one that actually
    // has a draft to update against — would find nothing and silently drop
    // the user's "Save and return" edit.
    if (!draftComment) {
      return;
    }

    const stateTransfer = embeddable?.getStateTransfer();
    // Peek first so we only drain when we are committing an add/update.
    const peeked = stateTransfer?.getIncomingEmbeddablePackage(currentAppId, false);
    // Lens transfers its package back keyed by the embeddable type
    // (LENS_EMBEDDABLE_TYPE, "vis"), not the app id ("lens").
    const lensEmbeddablePackage = peeked?.find((pkg) => pkg.type === LENS_EMBEDDABLE_TYPE) as
      | LensIncomingEmbeddablePackage
      | undefined;
    const serializedState = lensEmbeddablePackage?.serializedState;
    const packageAttributes = serializedState?.attributes;
    const refId = serializedState?.ref_id;

    if (!packageAttributes && !refId) {
      return;
    }

    let cancelled = false;

    const insertFromAttributes = (attributes: Record<string, unknown>) => {
      if (cancelled) {
        return;
      }

      // Drain so a re-render or sibling consumer can't double-process it.
      stateTransfer?.getIncomingEmbeddablePackage(currentAppId, true);
      const newTimeRange = getLensIncomingTimeRange(timefilter);

      if (draftComment.position) {
        handleUpdate(attributes, newTimeRange, draftComment.position);
        return;
      }

      handleAdd(attributes, newTimeRange);
    };

    if (packageAttributes) {
      insertFromAttributes(packageAttributes as Record<string, unknown>);
      return () => {
        cancelled = true;
      };
    }

    if (!refId) {
      return;
    }

    const resolveByRef = async () => {
      const attributes = await fetchLensAttributesForComment({
        id: refId,
        contentManagement,
      });
      if (cancelled) {
        return;
      }
      if (!attributes) {
        toasts.addDanger({ title: FAILED_TO_LOAD_VISUALIZATION });
        return;
      }
      insertFromAttributes(attributes);
    };

    resolveByRef();
    return () => {
      cancelled = true;
    };
  }, [
    embeddable,
    storage,
    timefilter,
    currentAppId,
    handleAdd,
    handleUpdate,
    draftComment,
    contentManagement,
    toasts,
  ]);

  const createLensButton = (
    <EuiButton onClick={handleCreateInLensClick} iconType="plusCircle">
      <FormattedMessage
        id="xpack.cases.markdownEditor.plugins.lens.createVisualizationButtonLabel"
        defaultMessage="Create new"
      />
    </EuiButton>
  );

  return (
    <EuiFlexGroup
      css={css`
        width: ${euiTheme.breakpoint.m};
        height: 100%;

        .euiModalBody {
          min-height: 300px;
        }
      `}
      direction="column"
      gutterSize="none"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.addVisualizationModalTitle"
            defaultMessage="Add visualization"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <SavedObjectFinder
          key="searchSavedObjectFinder"
          id="casesMarkdownLens"
          onChoose={handleChooseLensSO}
          showFilter={false}
          noItemsMessage={
            <FormattedMessage
              id="xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.notFoundLabel"
              defaultMessage="No matching lens found."
            />
          }
          savedObjectMetaData={savedObjectMetaData}
          fixedPageSize={10}
          services={{
            contentClient: contentManagement.client,
            uiSettings,
          }}
          leftChildren={createLensButton}
          helpText={
            attachmentsEnabled ? SEARCH_INPUT_HELP_TEXT_WITH_ATTACH_HINT : SEARCH_INPUT_HELP_TEXT
          }
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={handleClose} fill>
          <FormattedMessage
            id="xpack.cases.markdownEditor.plugins.lens.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiFlexGroup>
  );
};
LensEditorComponent.displayName = 'LensEditor';

export const LensEditor = React.memo(LensEditorComponent);

export const plugin = {
  name: ID,
  button: {
    label: VISUALIZATION,
    iconType: 'lensApp',
  },
  helpText: (
    <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
      {'!{lens<config>}'}
    </EuiCodeBlock>
  ),
  editor: LensEditor,
};
