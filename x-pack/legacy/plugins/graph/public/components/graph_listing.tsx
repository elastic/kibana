/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { EuiEmptyPrompt, EuiLink, EuiButton } from '@elastic/eui';

// @ts-ignore
import { TableListView } from '../../../../../../src/legacy/core_plugins/kibana/public/table_list_view/table_list_view';
import { GraphWorkspaceSavedObject } from '../types';

export interface GraphListingProps {
  createItem: () => void;
  findItems: (query: string, limit: number) => Promise<GraphWorkspaceSavedObject[]>;
  deleteItems: (ids: string[]) => Promise<void>;
  editItem: (record: GraphWorkspaceSavedObject) => void;
  getViewUrl: (record: GraphWorkspaceSavedObject) => string;
  listingLimit: number;
  hideWriteControls: boolean;
  capabilities: { save: boolean; delete: boolean };
  initialFilter: string;
}

export function GraphListing(props: GraphListingProps) {
  return (
    <I18nProvider>
      <TableListView
        createItem={props.capabilities.save ? props.createItem : null}
        findItems={props.findItems}
        deleteItems={props.capabilities.delete ? props.deleteItems : null}
        editItem={props.capabilities.save ? props.editItem : null}
        tableColumns={getTableColumns(props.getViewUrl)}
        listingLimit={props.listingLimit}
        initialFilter={props.initialFilter}
        noItemsFragment={getNoItemsMessage(props.capabilities.save === false, props.createItem)}
        entityName={i18n.translate('xpack.graph.listing.table.entityName', {
          defaultMessage: 'workspace',
        })}
        entityNamePlural={i18n.translate('xpack.graph.listing.table.entityNamePlural', {
          defaultMessage: 'workspaces',
        })}
        tableListTitle={i18n.translate('xpack.graph.listing.workspacesTitle', {
          defaultMessage: 'Workspaces',
        })}
      />
    </I18nProvider>
  );
}

function getNoItemsMessage(hideWriteControls: boolean, createItem: () => void) {
  if (hideWriteControls) {
    return (
      <div>
        <EuiEmptyPrompt
          iconType="visualizeApp"
          title={
            <h2>
              <FormattedMessage
                id="xpack.graph.listing.noItemsMessage"
                defaultMessage="Looks like you don't have any Graph workspaces."
              />
            </h2>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <EuiEmptyPrompt
        iconType="graphApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.graph.listing.createNewWorkspace.title"
              defaultMessage="Create your first Graph workspace"
            />
          </h2>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.graph.listing.createNewDashboard.combineDataViewFromKibanaAppDescription"
                defaultMessage="You can discover patterns and relationships in your Kibana index patterns."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.graph.listing.createNewDashboard.newToKibanaDescription"
                defaultMessage="New to Kibana? {sampleDataInstallLink} to take a test drive."
                values={{
                  sampleDataInstallLink: (
                    <EuiLink href="#/home/tutorial_directory/sampleData">
                      <FormattedMessage
                        id="xpack.graph.listing.createNewDashboard.sampleDataInstallLinkText"
                        defaultMessage="Install some sample data"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            onClick={createItem}
            fill
            iconType="plusInCircle"
            data-test-subj="graphCreateWorkspacePromptButton"
          >
            <FormattedMessage
              id="xpack.graph.listing.createNewWorkspace.createButtonLabel"
              defaultMessage="Create new graph workspace"
            />
          </EuiButton>
        }
      />
    </div>
  );
}

// TODO this is an EUI type but EUI doesn't provide this typing yet
interface DataColumn {
  field: string;
  name: string;
  sortable?: boolean;
  render?: (value: string, item: GraphWorkspaceSavedObject) => React.ReactNode;
  dataType?: 'auto' | 'string' | 'number' | 'date' | 'boolean';
}

function getTableColumns(getViewUrl: (record: GraphWorkspaceSavedObject) => string): DataColumn[] {
  return [
    {
      field: 'title',
      name: i18n.translate('xpack.graph.listing.table.titleColumnName', {
        defaultMessage: 'Title',
      }),
      sortable: true,
      render: (field, record) => (
        <EuiLink
          href={getViewUrl(record)}
          data-test-subj={`graphListingTitleLink-${record.title.split(' ').join('-')}`}
        >
          {field}
        </EuiLink>
      ),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.graph.listing.table.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
      dataType: 'string',
      sortable: true,
    },
  ];
}
