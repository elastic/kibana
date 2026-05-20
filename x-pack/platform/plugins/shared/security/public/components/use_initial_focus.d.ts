import type { DependencyList } from 'react';
/**
 * Creates a ref for an HTML element, which will be focussed on mount.
 *
 * @example
 * ```typescript
 * const firstInput = useInitialFocus();
 *
 * <EuiFieldText inputRef={firstInput} />
 * ```
 *
 * Pass in a dependency list to focus conditionally rendered components:
 *
 * @example
 * ```typescript
 * const firstInput = useInitialFocus([showField]);
 *
 * {showField ? <input ref={firstInput} /> : undefined}
 * ```
 */
export declare function useInitialFocus<T extends HTMLElement>(deps?: DependencyList): import("react").RefObject<T>;
