import React from 'react';
import type { OnSourceChangeArgs } from '../source';
import type { getFields } from './esql_utils';
import type { NormalizedESQLSourceDescriptor } from './esql_source';
interface Props {
    onChange(...args: OnSourceChangeArgs[]): void;
    sourceDescriptor: NormalizedESQLSourceDescriptor;
    getDataViewFields: () => Promise<ReturnType<typeof getFields>>;
}
export declare function UpdateSourceEditor(props: Props): React.JSX.Element;
export {};
