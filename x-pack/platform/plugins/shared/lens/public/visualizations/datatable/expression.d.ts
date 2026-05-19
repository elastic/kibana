import type { PaletteRegistry } from '@kbn/coloring';
import type { IAggType } from '@kbn/data-plugin/public';
import type { CoreSetup, IUiSettingsClient } from '@kbn/core/public';
import type { Datatable, ExpressionRenderDefinition, IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import type { ILensInterpreterRenderHandlers, LensCellValueAction } from '@kbn/lens-common';
import type { FormatFactory } from '../../../common/types';
import type { DatatableProps } from '../../../common/expressions';
export declare function getColumnsFilterable(table: Datatable, handlers: IInterpreterRenderHandlers): Promise<boolean[] | undefined>;
/**
 * Retrieves the compatible CELL_VALUE_TRIGGER actions indexed by column
 **/
export declare function getColumnCellValueActions(config: DatatableProps, getCompatibleCellValueActions?: ILensInterpreterRenderHandlers['getCompatibleCellValueActions']): Promise<LensCellValueAction[][]>;
export declare const getDatatableRenderer: (dependencies: {
    formatFactory: FormatFactory;
    getType: Promise<(name: string) => IAggType | undefined>;
    paletteService: PaletteRegistry;
    uiSettings: IUiSettingsClient;
    core: CoreSetup;
}) => ExpressionRenderDefinition<DatatableProps>;
