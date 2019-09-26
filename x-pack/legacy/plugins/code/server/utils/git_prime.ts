/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { Object, OdbObject, Oid, Repository, Signature, TreeEntry as TE } from '@elastic/nodegit';
import * as isogit from 'isomorphic-git';
import { CommitDescription, TagDescription, TreeDescription, TreeEntry } from 'isomorphic-git';
import * as fs from 'fs';

interface GitObjectParam {
  gitdir: string;
  oid: string;
  format?: string | undefined;
  filepath?: string | undefined;
}

interface GitRefParam {
  gitdir: string;
  ref: string;
  depth: number;
}

isogit.plugins.set('fs', fs);

export interface BlobDescription {
  isBinary(): boolean;
  content(): Buffer;
  rawsize(): number;
}

export interface GitObjectDescription {
  oid: string;
  type: 'blob' | 'tree' | 'commit' | 'tag';
  format: 'content' | 'parsed';
  object: BlobDescription | CommitDescription | TreeDescription | TagDescription | null;
}

export class GitPrime {
  public static async readObject({
    format = 'parsed',
    gitdir,
    oid,
    filepath,
  }: GitObjectParam): Promise<GitObjectDescription> {
    const repo = await Repository.openBare(gitdir);
    const odb = await repo.odb();
    const o = await odb.read(Oid.fromString(oid));
    const obj = new WrappedObj(o, repo);

    if (obj.type === 'commit' && filepath) {
      const commit = await repo.getCommit(o.id());
      const entry = await commit.getEntry(filepath);
      return GitPrime.readObject({ oid: entry.oid(), gitdir, format });
    }

    if (format === 'parsed' || format === 'content') {
      await obj.parse();
    }

    return obj as GitObjectDescription;
  }

  public static async resolveRef({ gitdir, ref, depth }: GitRefParam) {
    return await isogit.resolveRef({ gitdir, ref, depth });
  }

  public static async expandOid({ gitdir, oid }: { gitdir: string; oid: string }) {
    const repo = await Repository.openBare(gitdir);
    const o = await Object.lookupPrefix(repo, Oid.fromString(oid), oid.length, Object.TYPE.COMMIT);
    return o.id().tostrS();
  }

  static async listBranches(param: { gitdir: string; remote: string }) {
    return await isogit.listBranches(param);
  }

  static async listTags(param: { gitdir: string }) {
    return await isogit.listTags(param);
  }

  static async isTextFile({ gitdir, oid }: { gitdir: string; oid: string }) {
    const repo = await Repository.openBare(gitdir);
    const blob = await repo.getBlob(oid);
    return blob.isBinary() === 0;
  }
}

class WrappedObj implements GitObjectDescription {
  _format: 'content' | 'parsed' = 'content';
  _object: CommitDescription | TreeDescription | TagDescription | BlobDescription | null;
  constructor(private readonly o: OdbObject, private readonly repo: Repository) {
    this._object = null;
  }

  public get object() {
    return this._object;
  }

  public get format(): 'content' | 'parsed' {
    return this._format;
  }

  public get oid(): string {
    return this.o.id().tostrS();
  }
  public get type(): 'blob' | 'tree' | 'commit' | 'tag' {
    return type2str(this.o.type());
  }

  async parse() {
    function fromSignature(sign: Signature) {
      return {
        name: sign.name(),
        email: sign.email(),
        timestamp: sign.when().time,
        timezoneOffset: sign.when().offset,
      };
    }
    switch (this.o.type()) {
      case 1:
        const commit = await this.repo.getCommit(this.o.id());
        this._object = {
          tree: commit.treeId().tostrS(),
          author: fromSignature(commit.author()),
          message: commit.message(),
          committer: fromSignature(commit.committer()),
          parent: commit.parents().map(o => o.tostrS()),
        } as CommitDescription;
        break;
      case 2:
        const tree = await this.repo.getTree(this.o.id());
        const entries = tree.entries().map(convertEntry);
        this._object = {
          entries,
        } as TreeDescription;
        break;
      case 3:
        const blob = await this.repo.getBlob(this.o.id());
        this._object = {
          content() {
            return blob.content();
          },
          isBinary() {
            return blob.isBinary() === 1;
          },
          rawsize() {
            return blob.rawsize();
          },
        } as BlobDescription;
        break;
      case 4:
        const tag = await this.repo.getTag(this.o.id());
        this._object = {
          message: tag.message(),
          object: tag.targetId().tostrS(),
          tagger: fromSignature(tag.tagger()),
          tag: tag.name(),
          type: type2str(tag.targetType()),
        } as TagDescription;
        break;
      default:
        throw new Error('invalid object type ' + this.o.type());
    }
    this._format = 'parsed';
  }
}

function convertEntry(t: TE): TreeEntry {
  let mode: string;
  switch (t.filemode()) {
    case TE.FILEMODE.EXECUTABLE:
      mode = '100755';
      break;
    case TE.FILEMODE.BLOB:
      mode = '100644';
      break;
    case TE.FILEMODE.COMMIT:
      mode = '160000';
      break;
    case TE.FILEMODE.TREE:
      mode = '040000';
      break;
    case TE.FILEMODE.LINK:
      mode = '120000';
      break;
    default:
      throw new Error('invalid file mode.');
  }
  return {
    mode,
    path: t.path(),
    oid: t.sha(),
    type: type2str(t.type()),
  } as TreeEntry;
}

function type2str(t: number) {
  switch (t) {
    case 1:
      return 'commit';
    case 2:
      return 'tree';
    case 3:
      return 'blob';
    case 4:
      return 'tag';
    default:
      throw new Error('invalid object type ' + t);
  }
}

export { TreeEntry, CommitDescription, TreeDescription, TagDescription };
