import React from 'react';
import type { FileLayer } from '@elastic/ems-client';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { ChoroplethChartProps } from './types';
interface Props extends ChoroplethChartProps {
    formatFactory: FormatFactory;
    uiSettings: IUiSettingsClient;
    emsFileLayers: FileLayer[];
    onRenderComplete: () => void;
}
export declare function ChoroplethChart({ data, args, formatFactory, uiSettings, emsFileLayers, onRenderComplete, }: Props): React.JSX.Element | null;
export {};
