/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import styled from '@emotion/styled';
import moment from 'moment';
import { withAttrs } from '../../../utils/theme_utils/with_attrs';
import { TextScale } from '../../../../common/log_text_scale';
import {
  LogColumnRenderConfiguration,
  isTimestampColumnRenderConfiguration,
  isMessageColumnRenderConfiguration,
  columnWidthToCSS,
} from '../../../utils/log_column_render_configuration';
import { useFormattedTime, TimeFormat } from '../../formatted_time';
import { useMeasuredCharacterDimensions } from './text_styles';

const DATE_COLUMN_SLACK_FACTOR = 1.1;
const FIELD_COLUMN_MIN_WIDTH_CHARACTERS = 10;
const DETAIL_FLYOUT_ICON_MIN_WIDTH = 32;
const COLUMN_PADDING = 8;

export interface LogEntryColumnProps {
  baseWidth: string;
  growWeight: number;
  shrinkWeight: number;
}

export const LogEntryColumn = withAttrs(
  styled.div<LogEntryColumnProps>`
    align-items: stretch;
    display: flex;
    flex-basis: ${(props) => props.baseWidth || '0%'};
    flex-direction: row;
    flex-grow: ${(props) => props.growWeight || 0};
    flex-shrink: ${(props) => props.shrinkWeight || 0};
    overflow: hidden;
  `,
  (props) => ({
    role: props.props.role ?? 'cell',
  })
);

export const LogEntryColumnContent = withAttrs(
  styled.div`
    flex: 1 0 0%;
    padding: 2px ${COLUMN_PADDING}px;
  `,
  () => ({
    'data-test-subj': 'LogEntryColumnContent',
  })
);

export type LogEntryColumnWidth = Pick<
  LogEntryColumnProps,
  'baseWidth' | 'growWeight' | 'shrinkWeight'
>;

export const iconColumnId = Symbol('iconColumnId');

export interface LogEntryColumnWidths {
  [columnId: string]: LogEntryColumnWidth;
  [iconColumnId]: LogEntryColumnWidth;
}

export const getColumnWidths = (
  columns: LogColumnRenderConfiguration[],
  characterWidth: number,
  formattedDateWidth: number
): LogEntryColumnWidths =>
  columns.reduce<LogEntryColumnWidths>(
    (columnWidths, column) => {
      if (isTimestampColumnRenderConfiguration(column)) {
        const customWidth = column.timestampColumn.width
          ? columnWidthToCSS(column.timestampColumn.width)
          : undefined;

        return {
          ...columnWidths,
          [column.timestampColumn.id]: {
            growWeight: 0,
            shrinkWeight: 0,
            baseWidth:
              customWidth ??
              `${
                Math.ceil(characterWidth * formattedDateWidth * DATE_COLUMN_SLACK_FACTOR) +
                2 * COLUMN_PADDING
              }px`,
          },
        };
      } else if (isMessageColumnRenderConfiguration(column)) {
        const customWidth = column.messageColumn.width
          ? columnWidthToCSS(column.messageColumn.width)
          : undefined;

        return {
          ...columnWidths,
          [column.messageColumn.id]: {
            growWeight: 5,
            shrinkWeight: 0,
            baseWidth: customWidth ?? '0%',
          },
        };
      } else {
        const customWidth = column.fieldColumn.width
          ? columnWidthToCSS(column.fieldColumn.width)
          : undefined;

        return {
          ...columnWidths,
          [column.fieldColumn.id]: {
            growWeight: customWidth ? 0 : 1,
            shrinkWeight: 0,
            baseWidth:
              customWidth ??
              `${
                Math.ceil(characterWidth * FIELD_COLUMN_MIN_WIDTH_CHARACTERS) + 2 * COLUMN_PADDING
              }px`,
          },
        };
      }
    },
    {
      // the detail flyout icon column
      [iconColumnId]: {
        growWeight: 0,
        shrinkWeight: 0,
        baseWidth: `${DETAIL_FLYOUT_ICON_MIN_WIDTH + 2 * COLUMN_PADDING}px`,
      },
    }
  );

/**
 * This hook calculates the column widths based on the given configuration. It
 * depends on the `CharacterDimensionsProbe` it returns being rendered so it can
 * measure the monospace character size.
 */
export const useColumnWidths = ({
  columnConfigurations,
  scale,
  timeFormat = 'time',
}: {
  columnConfigurations: LogColumnRenderConfiguration[];
  scale: TextScale;
  timeFormat?: TimeFormat;
}) => {
  const { CharacterDimensionsProbe, dimensions } = useMeasuredCharacterDimensions(scale);
  const referenceTime = useMemo(() => moment().toISOString(), []);
  const formattedCurrentDate = useFormattedTime(referenceTime, { format: timeFormat });
  const columnWidths = useMemo(
    () => getColumnWidths(columnConfigurations, dimensions.width, formattedCurrentDate.length),
    [columnConfigurations, dimensions.width, formattedCurrentDate]
  );
  return useMemo(
    () => ({
      columnWidths,
      CharacterDimensionsProbe,
    }),
    [columnWidths, CharacterDimensionsProbe]
  );
};

// eslint-disable-next-line import/no-default-export
export default LogEntryColumn;
