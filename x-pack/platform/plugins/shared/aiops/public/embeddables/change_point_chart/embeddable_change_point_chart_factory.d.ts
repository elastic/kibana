import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { ChangePointEmbeddableApi } from './types';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';
export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;
export declare const getChangePointChartEmbeddableFactory: (getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>) => EmbeddableFactory<ChangePointEmbeddableState, ChangePointEmbeddableApi>;
