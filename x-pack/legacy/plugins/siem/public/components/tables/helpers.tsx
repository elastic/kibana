/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiPopover, EuiToolTip, EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import styled from 'styled-components';

import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../empty_value';
import { MoreRowItems, Spacer } from '../page';
import { IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { Provider } from '../timeline/data_providers/provider';

const Subtext = styled.div`
  font-size: ${props => props.theme.eui.euiFontSizeXS};
`;

export const getRowItemDraggable = ({
  rowItem,
  attrName,
  idPrefix,
  render,
  dragDisplayValue,
}: {
  rowItem: string | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  dragDisplayValue?: string;
  maxOverflow?: number;
}): JSX.Element => {
  if (rowItem != null) {
    const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}`);
    return (
      <DraggableWrapper
        key={id}
        dataProvider={{
          and: [],
          enabled: true,
          id,
          name: rowItem,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: attrName,
            value: rowItem,
            displayValue: dragDisplayValue || rowItem,
            operator: IS_OPERATOR,
          },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <>{render ? render(rowItem) : defaultToEmptyTag(rowItem)}</>
          )
        }
      />
    );
  } else {
    return getEmptyTagValue();
  }
};

export const getRowItemDraggables = ({
  rowItems,
  attrName,
  idPrefix,
  render,
  dragDisplayValue,
  displayCount = 5,
  maxOverflow = 5,
}: {
  rowItems: string[] | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  dragDisplayValue?: string;
  maxOverflow?: number;
}): JSX.Element => {
  if (rowItems != null && rowItems.length > 0) {
    const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
      const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}-${index}`);
      return (
        <React.Fragment key={id}>
          {index !== 0 && (
            <>
              {','}
              <Spacer />
            </>
          )}
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: rowItem,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: attrName,
                value: rowItem,
                displayValue: dragDisplayValue || rowItem,
                operator: IS_OPERATOR,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{render ? render(rowItem) : defaultToEmptyTag(rowItem)}</>
              )
            }
          />
        </React.Fragment>
      );
    });

    return draggables.length > 0 ? (
      <>
        {draggables} {getRowItemOverflow(rowItems, idPrefix, displayCount, maxOverflow)}
      </>
    ) : (
      getEmptyTagValue()
    );
  } else {
    return getEmptyTagValue();
  }
};

export const getRowItemOverflow = (
  rowItems: string[],
  idPrefix: string,
  overflowIndexStart = 5,
  maxOverflowItems = 5
): JSX.Element => {
  return (
    <>
      {rowItems.length > overflowIndexStart && (
        <Popover count={rowItems.length - overflowIndexStart} idPrefix={idPrefix}>
          <EuiText size="xs">
            <ul>
              {rowItems
                .slice(overflowIndexStart, overflowIndexStart + maxOverflowItems)
                .map(rowItem => (
                  <li key={`${idPrefix}-${rowItem}`}>{defaultToEmptyTag(rowItem)}</li>
                ))}
            </ul>

            {rowItems.length > overflowIndexStart + maxOverflowItems && (
              <p data-test-subj="popover-additional-overflow">
                <EuiTextColor color="subdued">
                  {rowItems.length - overflowIndexStart - maxOverflowItems}{' '}
                  <FormattedMessage
                    defaultMessage="more not shown"
                    id="xpack.siem.tables.rowItemHelper.moreDescription"
                  />
                </EuiTextColor>
              </p>
            )}
          </EuiText>
        </Popover>
      )}
    </>
  );
};

export const PopoverComponent = ({
  children,
  count,
  idPrefix,
}: {
  children: React.ReactNode;
  count: number;
  idPrefix: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Subtext>
      <EuiPopover
        button={<EuiLink onClick={() => setIsOpen(!isOpen)}>{`+${count} More`}</EuiLink>}
        closePopover={() => setIsOpen(!isOpen)}
        id={`${idPrefix}-popover`}
        isOpen={isOpen}
      >
        {children}
      </EuiPopover>
    </Subtext>
  );
};

PopoverComponent.displayName = 'PopoverComponent';

export const Popover = React.memo(PopoverComponent);

Popover.displayName = 'Popover';

export const OverflowFieldComponent = ({
  value,
  showToolTip = true,
  overflowLength = 50,
}: {
  value: string;
  showToolTip?: boolean;
  overflowLength?: number;
}) => (
  <span>
    {showToolTip ? (
      <EuiToolTip content={'message'} data-test-subj={'message-tooltip'}>
        <>{value.substring(0, overflowLength)}</>
      </EuiToolTip>
    ) : (
      <>{value.substring(0, overflowLength)}</>
    )}
    {value.length > overflowLength && (
      <EuiToolTip content={value}>
        <MoreRowItems type="boxesHorizontal" />
      </EuiToolTip>
    )}
  </span>
);

OverflowFieldComponent.displayName = 'OverflowFieldComponent';

export const OverflowField = React.memo(OverflowFieldComponent);

OverflowField.displayName = 'OverflowField';
