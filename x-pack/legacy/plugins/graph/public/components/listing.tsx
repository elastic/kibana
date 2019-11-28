/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { EuiEmptyPrompt, EuiLink, EuiButton } from '@elastic/eui';

import { CoreStart, ApplicationStart } from 'kibana/public';
import { TableListView } from '../../../../../../src/plugins/kibana_react/public';
import { GraphWorkspaceSavedObject } from '../types';

export interface ListingProps {
  coreStart: CoreStart;
  createItem: () => void;
  findItems: (query: string) => Promise<{ total: number; hits: GraphWorkspaceSavedObject[] }>;
  deleteItems: (records: GraphWorkspaceSavedObject[]) => Promise<void>;
  editItem: (record: GraphWorkspaceSavedObject) => void;
  getViewUrl: (record: GraphWorkspaceSavedObject) => string;
  listingLimit: number;
  hideWriteControls: boolean;
  capabilities: { save: boolean; delete: boolean };
  initialFilter: string;
}

export function Listing(props: ListingProps) {
  return (
    <I18nProvider>
      <TableListView
        createItem={props.capabilities.save ? props.createItem : undefined}
        findItems={props.findItems}
        deleteItems={props.capabilities.delete ? props.deleteItems : undefined}
        editItem={props.capabilities.save ? props.editItem : undefined}
        tableColumns={getTableColumns(props.getViewUrl)}
        listingLimit={props.listingLimit}
        initialFilter={props.initialFilter}
        noItemsFragment={getNoItemsMessage(
          props.capabilities.save === false,
          props.createItem,
          props.coreStart.application
        )}
        toastNotifications={props.coreStart.notifications.toasts}
        entityName={i18n.translate('xpack.graph.listing.table.entityName', {
          defaultMessage: 'graph',
        })}
        entityNamePlural={i18n.translate('xpack.graph.listing.table.entityNamePlural', {
          defaultMessage: 'graphs',
        })}
        tableListTitle={i18n.translate('xpack.graph.listing.graphsTitle', {
          defaultMessage: 'Graphs',
        })}
        uiSettings={props.coreStart.uiSettings}
      />
    </I18nProvider>
  );
}

function getNoItemsMessage(
  hideWriteControls: boolean,
  createItem: () => void,
  application: ApplicationStart
) {
  if (hideWriteControls) {
    return (
      <div>
        <EuiEmptyPrompt
          iconType="visualizeApp"
          title={
            <h2>
              <FormattedMessage
                id="xpack.graph.listing.noItemsMessage"
                defaultMessage="Looks like you don't have any graphs."
              />
            </h2>
          }
        />
      </div>
    );
  }

  const sampleDataUrl = `${application.getUrlForApp('kibana')}#/home/tutorial_directory/sampleData`;

  return (
    <div>
      <EuiEmptyPrompt
        iconType="graphApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.graph.listing.createNewGraph.title"
              defaultMessage="Create your first graph"
            />
          </h2>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.graph.listing.createNewGraph.combineDataViewFromKibanaAppDescription"
                defaultMessage="Discover patterns and relationships in your Elasticsearch indices."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.graph.listing.createNewGraph.newToKibanaDescription"
                defaultMessage="New to Kibana? Get started with {sampleDataInstallLink}."
                values={{
                  sampleDataInstallLink: (
                    <EuiLink href={sampleDataUrl}>
                      <FormattedMessage
                        id="xpack.graph.listing.createNewGraph.sampleDataInstallLinkText"
                        defaultMessage="sample data"
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
            data-test-subj="graphCreateGraphPromptButton"
          >
            <FormattedMessage
              id="xpack.graph.listing.createNewGraph.createButtonLabel"
              defaultMessage="Create graph"
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
