/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getOr } from 'lodash/fp';
import React, { Fragment, useState } from 'react';
import styled from 'styled-components';

import { AutonomousSystem, FlowTarget, HostEcsFields, IpOverviewData } from '../../graphql/types';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { DefaultDraggable } from '../draggables';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { HostDetailsLink, ReputationLink, VirusTotalLink, WhoIsLink } from '../links';
import { Spacer } from '../page';
import * as i18n from '../page/network/ip_overview/translations';

const DraggableContainerFlexGroup = styled(EuiFlexGroup)`
  flex-grow: unset;
`;

export const IpOverviewId = 'ip-overview';

/** The default max-height of the popover used to show "+n More" items (e.g. `+9 More`) */
export const DEFAULT_MORE_MAX_HEIGHT = '200px';

export const locationRenderer = (fieldNames: string[], data: IpOverviewData): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every(fieldName => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" data-test-subj="location-field" gutterSize="none">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <DefaultDraggable
                field={fieldName}
                id={`location-renderer-default-draggable-${IpOverviewId}-${fieldName}`}
                value={locationValue}
              />
            </EuiFlexItem>
          </Fragment>
        );
      })}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const dateRenderer = (timestamp?: string | null): React.ReactElement => (
  <FormattedRelativePreferenceDate value={timestamp} />
);

export const autonomousSystemRenderer = (
  as: AutonomousSystem,
  flowTarget: FlowTarget
): React.ReactElement =>
  as && as.organization && as.organization.name && as.number ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          field={`${flowTarget}.as.organization.name`}
          id={`autonomous-system-renderer-default-draggable-${IpOverviewId}-${flowTarget}.as.organization.name`}
          value={as.organization.name}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{'/'}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          field={`${flowTarget}.as.number`}
          id={`autonomous-system-renderer-default-draggable-${IpOverviewId}-${flowTarget}.as.number`}
          value={`${as.number}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

interface HostIdRendererTypes {
  host: HostEcsFields;
  ipFilter?: string;
  noLink?: boolean;
}

export const hostIdRenderer = ({
  host,
  ipFilter,
  noLink,
}: HostIdRendererTypes): React.ReactElement =>
  host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {host.name && host.name[0] != null ? (
        <DefaultDraggable
          field="host.id"
          id={`host-id-renderer-default-draggable-${IpOverviewId}-host-id`}
          value={host.id[0]}
        >
          {noLink ? (
            <>{host.id}</>
          ) : (
            <HostDetailsLink hostName={host.name[0]}>{host.id}</HostDetailsLink>
          )}
        </DefaultDraggable>
      ) : (
        <>{host.id}</>
      )}
    </>
  ) : (
    getEmptyTagValue()
  );

export const hostNameRenderer = (host: HostEcsFields, ipFilter?: string): React.ReactElement =>
  host.name && host.name[0] && host.ip && (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <DefaultDraggable
      field={'host.name'}
      id={`host-name-renderer-default-draggable-${IpOverviewId}-host-name`}
      value={host.name[0]}
    >
      <HostDetailsLink hostName={host.name[0]}>
        {host.name ? host.name : getEmptyTagValue()}
      </HostDetailsLink>
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );

export const whoisRenderer = (ip: string) => <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;

export const reputationRenderer = (ip: string): React.ReactElement => (
  <>
    <VirusTotalLink link={ip}>{i18n.VIEW_VIRUS_TOTAL}</VirusTotalLink>
    {', '}
    <ReputationLink domain={ip}>{i18n.VIEW_TALOS_INTELLIGENCE}</ReputationLink>
  </>
);

interface DefaultFieldRendererProps {
  rowItems: string[] | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  moreMaxHeight?: string;
}

// TODO: This causes breaks between elements until the ticket below is fixed
// https://github.com/elastic/ingest-dev/issues/474
export const DefaultFieldRenderer = React.memo<DefaultFieldRendererProps>(
  ({
    attrName,
    displayCount = 1,
    idPrefix,
    moreMaxHeight = DEFAULT_MORE_MAX_HEIGHT,
    render,
    rowItems,
  }) => {
    if (rowItems != null && rowItems.length > 0) {
      const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
        const id = escapeDataProviderId(
          `default-field-renderer-default-draggable-${idPrefix}-${attrName}-${rowItem}`
        );
        return (
          <EuiFlexItem key={id} grow={false}>
            {index !== 0 && (
              <>
                {','}
                <Spacer />
              </>
            )}
            <DefaultDraggable field={attrName} id={id} value={rowItem}>
              {render ? render(rowItem) : rowItem}
            </DefaultDraggable>
          </EuiFlexItem>
        );
      });

      return draggables.length > 0 ? (
        <DraggableContainerFlexGroup alignItems="center" component="span" gutterSize="none">
          {draggables}{' '}
          {
            <DefaultFieldRendererOverflow
              idPrefix={idPrefix}
              moreMaxHeight={moreMaxHeight}
              overflowIndexStart={displayCount}
              render={render}
              rowItems={rowItems}
            />
          }
        </DraggableContainerFlexGroup>
      ) : (
        getEmptyTagValue()
      );
    } else {
      return getEmptyTagValue();
    }
  }
);

DefaultFieldRenderer.displayName = 'DefaultFieldRenderer';

interface DefaultFieldRendererOverflowProps {
  rowItems: string[];
  idPrefix: string;
  render?: (item: string) => React.ReactNode;
  overflowIndexStart?: number;
  moreMaxHeight: string;
}

interface MoreContainerProps {
  idPrefix: string;
  render?: (item: string) => React.ReactNode;
  rowItems: string[];
  moreMaxHeight: string;
  overflowIndexStart: number;
}

/** A container (with overflow) for showing "More" items in a popover */
export const MoreContainer = React.memo<MoreContainerProps>(
  ({ idPrefix, render, rowItems, moreMaxHeight, overflowIndexStart }) => (
    <div
      data-test-subj="more-container"
      style={{
        maxHeight: moreMaxHeight,
        overflow: 'auto',
        paddingRight: '2px',
      }}
    >
      {rowItems.slice(overflowIndexStart).map((rowItem, i) => (
        <EuiText key={`${idPrefix}-${rowItem}-${i}`} size="s">
          {render ? render(rowItem) : rowItem}
        </EuiText>
      ))}
    </div>
  )
);

MoreContainer.displayName = 'MoreContainer';

export const DefaultFieldRendererOverflow = React.memo<DefaultFieldRendererOverflowProps>(
  ({ idPrefix, moreMaxHeight, overflowIndexStart = 5, render, rowItems }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <EuiFlexItem grow={false}>
        {rowItems.length > overflowIndexStart && (
          <EuiPopover
            button={
              <>
                {' ,'}
                <EuiButtonEmpty size="xs" onClick={() => setIsOpen(!isOpen)}>
                  {`+${rowItems.length - overflowIndexStart} `}
                  <FormattedMessage
                    defaultMessage="More"
                    id="xpack.siem.fieldRenderers.moreLabel"
                  />
                </EuiButtonEmpty>
              </>
            }
            closePopover={() => setIsOpen(!isOpen)}
            id="popover"
            isOpen={isOpen}
          >
            <MoreContainer
              idPrefix={idPrefix}
              moreMaxHeight={moreMaxHeight}
              overflowIndexStart={overflowIndexStart}
              render={render}
              rowItems={rowItems}
            />
          </EuiPopover>
        )}
      </EuiFlexItem>
    );
  }
);

DefaultFieldRendererOverflow.displayName = 'DefaultFieldRendererOverflow';
