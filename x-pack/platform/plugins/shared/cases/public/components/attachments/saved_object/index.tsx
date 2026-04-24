/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import * as rt from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import {
  SO_DASHBOARD_ATTACHMENT_TYPE,
  SO_DISCOVER_SESSION_ATTACHMENT_TYPE,
  SO_LENS_ATTACHMENT_TYPE,
  SO_MAP_ATTACHMENT_TYPE,
  SO_RULE_ATTACHMENT_TYPE,
  SO_VISUALIZATION_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';
import type {
  UnifiedReferenceAttachmentType,
  UnifiedReferenceAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { useKibana } from '../../../common/lib/kibana';
import { makeSavedObjectAttachmentsTab } from './saved_object_attachments_tab';
import * as i18n from './translations';

type SavedObjectKind = 'dashboard' | 'visualization' | 'search' | 'alert' | 'lens' | 'map';

interface SavedObjectAttachmentConfig {
  id: string;
  savedObjectType: SavedObjectKind;
  icon: string;
  displayName: string;
  removedEventLabel: string;
}

/**
 * Response shape for /api/kibana/management/saved_objects/_bulk_get.
 * The saved_objects_management plugin populates `meta.inAppUrl.path` from each
 * saved object type's own `management.getInAppUrl` registration, so we don't
 * own the routing knowledge inside Cases.
 */
interface BulkGetMetaResponseItem {
  id: string;
  type: string;
  meta?: {
    inAppUrl?: { path?: string; uiCapabilitiesPath?: string };
  };
}

const SavedObjectAttachmentView: React.FC<
  UnifiedReferenceAttachmentViewProps & {
    config: SavedObjectAttachmentConfig;
  }
> = ({ attachmentId, metadata, config }) => {
  const {
    services: { http },
  } = useKibana();

  const title = (metadata?.title as string | undefined) ?? '';
  const id = Array.isArray(attachmentId) ? attachmentId[0] : attachmentId;

  const [href, setHref] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await http.post<BulkGetMetaResponseItem[]>(
          '/api/kibana/management/saved_objects/_bulk_get',
          { body: JSON.stringify([{ type: config.savedObjectType, id }]) }
        );
        const path = resp?.[0]?.meta?.inAppUrl?.path;
        if (!cancelled && path) {
          setHref(http.basePath.prepend(path));
        }
      } catch {
        // Leave href undefined; the title will render as plain text.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http, config.savedObjectType, id]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {href ? (
            <EuiLink href={href} data-test-subj={`cases-so-attachment-link-${id}`}>
              {title || id}
            </EuiLink>
          ) : (
            title || id
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SavedObjectAttachmentView.displayName = 'SavedObjectAttachmentView';

const makeSavedObjectMetadataRt = (expected: SavedObjectKind) =>
  rt.strict({
    title: rt.string,
    savedObjectType: rt.literal(expected),
  });

const makeSchemaValidator = (expected: SavedObjectKind) => {
  const codec = makeSavedObjectMetadataRt(expected);
  return (data: unknown): void => {
    const result = codec.decode(data);
    if (!isRight(result)) {
      throw new Error(
        `Invalid saved object attachment metadata: expected { title: string, savedObjectType: '${expected}' }`
      );
    }
  };
};

const makeAttachmentType = (
  config: SavedObjectAttachmentConfig
): UnifiedReferenceAttachmentType => {
  const TabView = makeSavedObjectAttachmentsTab({
    attachmentTypeId: config.id,
    savedObjectType: config.savedObjectType,
    icon: config.icon,
  });
  return {
    id: config.id,
    icon: config.icon,
    displayName: config.displayName,
    getAttachmentViewObject: (props) => ({
      event: <SavedObjectAttachmentView {...props} config={config} />,
      timelineAvatar: config.icon,
      hideDefaultActions: false,
    }),
    getAttachmentRemovalObject: () => ({ event: config.removedEventLabel }),
    getAttachmentTabViewObject: () => ({ children: TabView }),
    schemaValidator: makeSchemaValidator(config.savedObjectType),
  };
};

export const getDashboardAttachmentType = (): UnifiedReferenceAttachmentType =>
  makeAttachmentType({
    id: SO_DASHBOARD_ATTACHMENT_TYPE,
    savedObjectType: 'dashboard',
    icon: 'dashboardApp',
    displayName: i18n.DASHBOARD,
    removedEventLabel: i18n.REMOVED_DASHBOARD,
  });

export const getVisualizationSOAttachmentType = (): UnifiedReferenceAttachmentType =>
  makeAttachmentType({
    id: SO_VISUALIZATION_ATTACHMENT_TYPE,
    savedObjectType: 'visualization',
    icon: 'visualizeApp',
    displayName: i18n.VISUALIZATION,
    removedEventLabel: i18n.REMOVED_VISUALIZATION,
  });

export const getDiscoverSessionAttachmentType = (): UnifiedReferenceAttachmentType =>
  makeAttachmentType({
    id: SO_DISCOVER_SESSION_ATTACHMENT_TYPE,
    savedObjectType: 'search',
    icon: 'discoverApp',
    displayName: i18n.DISCOVER_SESSION,
    removedEventLabel: i18n.REMOVED_DISCOVER_SESSION,
  });

export const getRuleAttachmentType = (): UnifiedReferenceAttachmentType =>
  makeAttachmentType({
    id: SO_RULE_ATTACHMENT_TYPE,
    savedObjectType: 'alert',
    icon: 'bell',
    displayName: i18n.RULE,
    removedEventLabel: i18n.REMOVED_RULE,
  });

export const getLensSOAttachmentType = (): UnifiedReferenceAttachmentType =>
  makeAttachmentType({
    id: SO_LENS_ATTACHMENT_TYPE,
    savedObjectType: 'lens',
    icon: 'lensApp',
    displayName: i18n.LENS,
    removedEventLabel: i18n.REMOVED_LENS,
  });

export const getMapAttachmentType = (): UnifiedReferenceAttachmentType =>
  makeAttachmentType({
    id: SO_MAP_ATTACHMENT_TYPE,
    savedObjectType: 'map',
    icon: 'gisApp',
    displayName: i18n.MAP,
    removedEventLabel: i18n.REMOVED_MAP,
  });
