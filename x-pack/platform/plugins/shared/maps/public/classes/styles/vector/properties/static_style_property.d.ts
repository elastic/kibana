import { AbstractStyleProperty } from './style_property';
import type { STYLE_TYPE } from '../../../../../common/constants';
export declare class StaticStyleProperty<T extends object> extends AbstractStyleProperty<T> {
    static type: STYLE_TYPE;
}
