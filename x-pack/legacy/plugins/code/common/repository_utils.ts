/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import GitUrlParse from 'git-url-parse';
import path from 'path';
import { Location } from 'vscode-languageserver';

import { CloneProgress, FileTree, FileTreeItemType, Repository, RepositoryUri } from '../model';
import { parseLspUrl, toCanonicalUrl } from './uri_util';

export class RepositoryUtils {
  // Generate a Repository instance by parsing repository remote url
  public static buildRepository(remoteUrl: string): Repository {
    const repo = GitUrlParse(remoteUrl.trim());
    let host = repo.source ? repo.source : '';
    if (repo.port !== null) {
      host = host + ':' + repo.port;
    }

    // Remove the leading `/` and tailing `.git` if necessary.
    const pathname =
      repo.pathname && repo.git_suffix
        ? repo.pathname.substr(1, repo.pathname.length - 5)
        : repo.pathname.substr(1);

    // The pathname should look like `a/b/c` now.
    const segs = pathname.split('/').filter(s => s.length > 0);

    const org = segs.length >= 2 ? segs.slice(0, segs.length - 1).join('_') : '_';
    const name = segs.length >= 1 ? segs[segs.length - 1] : '_';
    const uri: RepositoryUri = host ? `${host}/${org}/${name}` : repo.full_name;
    return {
      uri,
      url: repo.href as string,
      name,
      org,
      protocol: repo.protocol,
    };
  }

  // From uri 'origin/org/name' to 'org'
  public static orgNameFromUri(repoUri: RepositoryUri): string {
    const segs = repoUri.split('/');
    if (segs && segs.length === 3) {
      return segs[1];
    }

    throw new Error('Invalid repository uri.');
  }

  // From uri 'origin/org/name' to 'name'
  public static repoNameFromUri(repoUri: RepositoryUri): string {
    const segs = repoUri.split('/');
    if (segs && segs.length === 3) {
      return segs[2];
    }

    throw new Error('Invalid repository uri.');
  }

  // From uri 'origin/org/name' to 'org/name'
  public static repoFullNameFromUri(repoUri: RepositoryUri): string {
    const segs = repoUri.split('/');
    if (segs && segs.length === 3) {
      return segs[1] + '/' + segs[2];
    }

    throw new Error('Invalid repository uri.');
  }

  // Return the local data path of a given repository.
  public static repositoryLocalPath(repoPath: string, repoUri: RepositoryUri) {
    return path.join(repoPath, repoUri);
  }

  public static normalizeRepoUriToIndexName(repoUri: RepositoryUri) {
    // Following the unit test here in Elasticsearch repository:
    // https://github.com/elastic/elasticsearch/blob/c75773745cd048cd81a58c7d8a74272b45a25cc6/server/src/test/java/org/elasticsearch/cluster/metadata/MetaDataCreateIndexServiceTests.java#L404
    const hash = crypto
      .createHash('md5')
      .update(repoUri)
      .digest('hex')
      .substring(0, 8);
    // Invalid chars in index can be found here:
    // https://github.com/elastic/elasticsearch/blob/237650e9c054149fd08213b38a81a3666c1868e5/server/src/main/java/org/elasticsearch/common/Strings.java#L376
    const normalizedUri = repoUri.replace(/[/\\?%*:|"<> ,]/g, '-');
    // Elasticsearch index name is case insensitive
    return `${normalizedUri}-${hash}`.toLowerCase();
  }

  public static locationToUrl(loc: Location) {
    const url = parseLspUrl(loc.uri);
    const { repoUri, file, revision } = url;
    if (repoUri && file && revision) {
      return toCanonicalUrl({ repoUri, file, revision, position: loc.range.start });
    }
    return '';
  }

  public static getAllFiles(fileTree: FileTree): string[] {
    if (!fileTree) {
      return [];
    }
    let result: string[] = [];
    switch (fileTree.type) {
      case FileTreeItemType.File:
        result.push(fileTree.path!);
        break;
      case FileTreeItemType.Directory:
        for (const node of fileTree.children!) {
          result = result.concat(RepositoryUtils.getAllFiles(node));
        }
        break;
      default:
        break;
    }
    return result;
  }

  public static hasFullyCloned(cloneProgress?: CloneProgress | null): boolean {
    return !!cloneProgress && cloneProgress.isCloned !== undefined && cloneProgress.isCloned;
  }
}
