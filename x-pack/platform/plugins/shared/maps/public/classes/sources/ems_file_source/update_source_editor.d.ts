import React from 'react';
import type { IEmsFileSource } from './ems_file_source';
import type { IField } from '../../fields/field';
import type { OnSourceChangeArgs } from '../source';
interface Props {
    layerId: string;
    onChange: (...args: OnSourceChangeArgs[]) => void;
    source: IEmsFileSource;
    tooltipFields: IField[];
}
export declare function UpdateSourceEditor(props: Props): React.JSX.Element;
export {};
