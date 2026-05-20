import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common';
import type { EuiThemeComputed } from '@elastic/eui';
import type { AnomaliesTableData } from '../explorer_utils';
export declare const getMLAnomaliesTypicalLayer: (anomalies: AnomaliesTableData["anomalies"]) => VectorLayerDescriptor;
export declare const getMLAnomaliesActualLayer: (anomalies: any, euiTheme: EuiThemeComputed) => VectorLayerDescriptor;
