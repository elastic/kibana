import type { FC, PropsWithChildren } from 'react';
import type { Validation } from '../../../../../common/job_validator';
interface Props {
    validation: Validation;
    titleId: string;
    errorId: string;
}
export declare const Description: FC<PropsWithChildren<Props>>;
export {};
