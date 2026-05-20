import { type timeScaleFn } from '../../impl/time_scale/time_scale_fn';
import type { TimeScaleExpressionFunction } from './types';
export declare const getTimeScale: (...timeScaleFnParameters: Parameters<typeof timeScaleFn>) => TimeScaleExpressionFunction;
