import { AbstractStyleProperty } from './style_property';
import type { SymbolizeAsOptions } from '../../../../../common/descriptor_types';
export declare class SymbolizeAsProperty extends AbstractStyleProperty<SymbolizeAsOptions> {
    isSymbolizedAsIcon: () => boolean;
}
