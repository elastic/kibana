import type { FC } from 'react';
import type { INPUT_TYPE } from '../inference_base';
import type { InferrerType } from '..';
interface Props {
    inferrer: InferrerType;
    inputType: INPUT_TYPE;
}
export declare const InferenceInputForm: FC<Props>;
export {};
