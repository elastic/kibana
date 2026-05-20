import { type FC } from 'react';
interface DestinationIndexFormProps {
    createIndexLink: string;
    destinationIndex: string;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameExists: boolean;
    destinationIndexNameValid: boolean;
    destIndexSameAsId: boolean;
    fullWidth?: boolean;
    indexNameExistsMessage: string;
    isJobCreated: boolean;
    onDestinationIndexChange: (d: string) => void;
    setDestIndexSameAsId: (d: boolean) => void;
    switchLabel: string;
}
export declare const DestinationIndexForm: FC<DestinationIndexFormProps>;
export {};
