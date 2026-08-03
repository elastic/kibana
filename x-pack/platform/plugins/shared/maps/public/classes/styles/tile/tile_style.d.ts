import type { IStyle } from '../style';
import type { StyleDescriptor } from '../../../../common/descriptor_types';
import { LAYER_STYLE_TYPE } from '../../../../common/constants';
export declare class TileStyle implements IStyle {
    readonly _descriptor: StyleDescriptor;
    constructor();
    getType(): LAYER_STYLE_TYPE;
    renderEditor(): null;
}
