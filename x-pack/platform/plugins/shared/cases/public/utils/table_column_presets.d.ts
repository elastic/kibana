import { type ComponentProps } from 'react';
import type { ColumnPreset } from '@kbn/shared-ux-column-presets';
import { SeverityHealth } from '../components/severity/config';
/**
 * @internal
 */
export declare const tableColumnPresetSeverity: ColumnPreset<{
    renderProps?: Partial<ComponentProps<typeof SeverityHealth>>;
}>;
/**
 * @internal
 */
export declare const tableColumnPresetDateRelative: ColumnPreset<{
    stripMs: boolean;
}>;
