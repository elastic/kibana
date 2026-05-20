import React from 'react';
import { type Changelog } from '../utils';
interface Props {
    changelog: Changelog;
    isLoading: boolean;
    onClose: () => void;
}
export declare const ChangelogModal: React.FunctionComponent<Props>;
export {};
