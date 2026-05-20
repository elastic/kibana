import type { FC } from 'react';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
interface Props {
    settings: IndicesIndexSettings;
    setSettings?: (settings: string) => void;
    readonly?: boolean;
}
export declare const Settings: FC<Props>;
export {};
