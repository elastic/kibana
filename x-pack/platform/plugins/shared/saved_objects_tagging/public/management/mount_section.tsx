/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import ReactDOM from 'react-dom';
import { CoreSetup, ApplicationStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { getTagsCapabilities } from '../../common';
import { SavedObjectTaggingPluginStart } from '../types';
import { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../services';
import { TagManagementPage } from './tag_management_page';

interface MountSectionParams {
  tagClient: ITagInternalClient;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  core: CoreSetup<{}, SavedObjectTaggingPluginStart>;
  mountParams: ManagementAppMountParams;
  title: string;
}

const RedirectToHomeIfUnauthorized: FC<
  PropsWithChildren<{
    applications: ApplicationStart;
  }>
> = ({ applications, children }) => {
  const allowed = applications.capabilities?.management?.kibana?.tags ?? false;
  if (!allowed) {
    applications.navigateToApp('home');
    return null;
  }
  return children! as React.ReactElement;
};

export const mountSection = async ({
  tagClient,
  tagCache,
  assignmentService,
  core,
  mountParams,
  title,
}: MountSectionParams) => {
  const [coreStart] = await core.getStartServices();
  const { element, setBreadcrumbs } = mountParams;
  const capabilities = getTagsCapabilities(coreStart.application.capabilities);
  const assignableTypes = await assignmentService.getAssignableTypes();
  coreStart.chrome.docTitle.change(title);

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <RedirectToHomeIfUnauthorized applications={coreStart.application}>
        <TagManagementPage
          setBreadcrumbs={setBreadcrumbs}
          core={coreStart}
          tagClient={tagClient}
          tagCache={tagCache}
          assignmentService={assignmentService}
          capabilities={capabilities}
          assignableTypes={assignableTypes}
        />
      </RedirectToHomeIfUnauthorized>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
