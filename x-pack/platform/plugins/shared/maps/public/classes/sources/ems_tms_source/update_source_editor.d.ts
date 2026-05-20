import React from 'react';
import type { EmsTmsSourceConfig } from './tile_service_select';
import type { OnSourceChangeArgs } from '../source';
interface Props {
    onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
    config: EmsTmsSourceConfig;
}
export declare function UpdateSourceEditor({ onChange, config }: Props): React.JSX.Element;
export {};
