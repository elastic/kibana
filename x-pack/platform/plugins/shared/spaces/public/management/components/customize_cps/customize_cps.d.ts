import { type FC } from 'react';
import type { CustomizeSpaceFormValues } from '../../types';
interface Props {
    space: CustomizeSpaceFormValues;
    onChange: (space: CustomizeSpaceFormValues) => void;
}
export declare const CustomizeCps: FC<Props>;
export {};
