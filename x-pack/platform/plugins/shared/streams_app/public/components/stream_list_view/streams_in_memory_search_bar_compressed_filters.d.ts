import type { EuiThemeComputed } from '@elastic/eui';
/**
 * {@link EuiSearchBar} uses a compressed {@link EuiFieldSearch} in the search holder while
 * filters render in an uncompressed {@link EuiFilterGroup}. Unified {@link StreamsAppSearchBar}
 * adds a SuperDatePicker and buttons in `toolsRight`. Normalize all of them to the same
 * EUI compressed form control block size ({@link EuiThemeComputed} `size.xl`, see EUI
 * `euiFormVariables.controlCompressedHeight` in form.styles).
 *
 * @see https://eui.elastic.co/docs/components/forms/search-and-filter/search-bar/
 */
export declare const streamsInMemorySearchBarCompressedFiltersCss: (euiTheme: EuiThemeComputed) => string;
