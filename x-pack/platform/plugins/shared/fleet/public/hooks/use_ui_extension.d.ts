import React from 'react';
import type { UIExtensionPoint, UIExtensionsStorage } from '../types';
export declare const UIExtensionsContext: React.Context<UIExtensionsStorage>;
type NarrowExtensionPoint<V extends UIExtensionPoint['view'], A = UIExtensionPoint> = A extends {
    view: V;
} ? A : never;
export declare const useUIExtension: <V extends UIExtensionPoint["view"] = UIExtensionPoint["view"]>(packageName: UIExtensionPoint["package"], view: V) => NarrowExtensionPoint<V> | undefined;
export {};
