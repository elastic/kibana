import type { FC } from 'react';
import type { CalloutMessage } from '@kbn/ml-validators';
import { VALIDATION_STATUS } from '@kbn/ml-validators';
export declare const defaultIconType = "question";
export declare const statusToEuiIconType: (status: VALIDATION_STATUS) => "warning" | "info" | "check" | "cross";
export declare const Callout: FC<CalloutMessage>;
