/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@elastic/lsp-extension';
import { kfetch } from 'ui/kfetch';
import { Location } from 'vscode-languageserver';

import {
  AbstractSuggestionsProvider,
  AutocompleteSuggestion,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '.';
import { RepositoryUtils } from '../../../../common/repository_utils';
import { parseLspUrl, toRepoNameWithOrg } from '../../../../common/uri_util';
import { SearchScope } from '../../../../model';

export class SymbolSuggestionsProvider extends AbstractSuggestionsProvider {
  protected matchSearchScope(scope: SearchScope): boolean {
    return scope === SearchScope.DEFAULT || scope === SearchScope.SYMBOL;
  }

  protected async fetchSuggestions(
    query: string,
    repoScope?: string[]
  ): Promise<AutocompleteSuggestionGroup> {
    try {
      const queryParams: { q: string; repoScope?: string } = { q: query };
      if (repoScope && repoScope.length > 0) {
        queryParams.repoScope = repoScope.join(',');
      }
      const res = await kfetch({
        pathname: `/api/code/suggestions/symbol`,
        method: 'get',
        query: queryParams,
      });
      const suggestions = Array.from(res.symbols as DetailSymbolInformation[])
        .slice(0, this.MAX_SUGGESTIONS_PER_GROUP)
        .map((symbol: DetailSymbolInformation) => {
          return {
            description: this.getSymbolDescription(symbol.symbolInformation.location),
            end: 10,
            start: 1,
            text: symbol.qname,
            tokenType: this.symbolKindToTokenClass(symbol.symbolInformation.kind),
            selectUrl: this.getSymbolLinkUrl(symbol.symbolInformation.location),
          };
        });
      return {
        type: AutocompleteSuggestionType.SYMBOL,
        total: res.total,
        hasMore: res.total > this.MAX_SUGGESTIONS_PER_GROUP,
        suggestions: suggestions as AutocompleteSuggestion[],
      };
    } catch (error) {
      return {
        type: AutocompleteSuggestionType.SYMBOL,
        total: 0,
        hasMore: false,
        suggestions: [],
      };
    }
  }

  private getSymbolDescription(location: Location) {
    try {
      const { repoUri, file } = parseLspUrl(location.uri);
      const repoName = toRepoNameWithOrg(repoUri);
      return `${repoName} > ${file}`;
    } catch (error) {
      return '';
    }
  }

  private getSymbolLinkUrl(location: Location) {
    try {
      return RepositoryUtils.locationToUrl(location);
    } catch (error) {
      return '';
    }
  }

  private symbolKindToTokenClass(kind: number): string {
    switch (kind) {
      case 1: // File
        return 'tokenFile';
      case 2: // Module
        return 'tokenModule';
      case 3: // Namespace
        return 'tokenNamespace';
      case 4: // Package
        return 'tokenPackage';
      case 5: // Class
        return 'tokenClass';
      case 6: // Method
        return 'tokenMethod';
      case 7: // Property
        return 'tokenProperty';
      case 8: // Field
        return 'tokenField';
      case 9: // Constructor
        return 'tokenConstant';
      case 10: // Enum
        return 'tokenEnum';
      case 11: // Interface
        return 'tokenInterface';
      case 12: // Function
        return 'tokenFunction';
      case 13: // Variable
        return 'tokenVariable';
      case 14: // Constant
        return 'tokenConstant';
      case 15: // String
        return 'tokenString';
      case 16: // Number
        return 'tokenNumber';
      case 17: // Bollean
        return 'tokenBoolean';
      case 18: // Array
        return 'tokenArray';
      case 19: // Object
        return 'tokenObject';
      case 20: // Key
        return 'tokenKey';
      case 21: // Null
        return 'tokenNull';
      case 22: // EnumMember
        return 'tokenEnumMember';
      case 23: // Struct
        return 'tokenStruct';
      case 24: // Event
        return 'tokenEvent';
      case 25: // Operator
        return 'tokenOperator';
      case 26: // TypeParameter
        return 'tokenParameter';
      default:
        return 'tokenElement';
    }
  }
}
