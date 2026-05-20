import type { FC } from 'react';
import type { GeoPointExample } from '../../../../../common/types/field_request_config';
interface Props {
    examples: Array<string | GeoPointExample | object>;
}
export declare const EMPTY_EXAMPLE: string;
export declare const ExamplesList: FC<Props>;
export {};
