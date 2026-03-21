import type { FC } from 'react';
import { STATUS } from '../../../../file_upload_manager';
interface Props {
    setIndexName: (name: string) => void;
    setIndexValidationStatus: (status: STATUS) => void;
    initialIndexName?: string;
}
export declare const IndexInput: FC<Props>;
export {};
