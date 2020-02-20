/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AllCases, AllCasesSnake, Case, CaseSnake, CommentSnake, Comment } from './types';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const convertCommentToCamel = (snakeComment: CommentSnake): Comment => ({
  commentId: snakeComment.comment_id,
  comment: snakeComment.comment,
  createdAt: snakeComment.created_at,
  createdBy: {
    username: snakeComment.created_by.username,
    fullName: snakeComment.created_by.full_name,
  },
  updatedAt: snakeComment.updated_at,
  version: snakeComment.version,
});

export const convertCaseToCamel = (snakeCase: CaseSnake): Case => ({
  caseId: snakeCase.case_id,
  comments: snakeCase.comments.map(snakeComment => convertCommentToCamel(snakeComment)),
  createdAt: snakeCase.created_at,
  createdBy: {
    username: snakeCase.created_by.username,
    fullName: snakeCase.created_by.full_name,
  },
  description: snakeCase.description,
  state: snakeCase.state,
  tags: snakeCase.tags,
  title: snakeCase.title,
  updatedAt: snakeCase.updated_at,
  version: snakeCase.version,
});

export const convertAllCasesToCamel = (snakeCases: AllCasesSnake): AllCases => ({
  cases: snakeCases.cases.map(snakeCase => convertCaseToCamel(snakeCase)),
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});

export const convertUpdateCaseToCamel = (snakeCase: Partial<CaseSnake>): Partial<Case> => {
  const updateCase: Partial<Case> = {};
  Object.keys(snakeCase).forEach(key => {
    switch (key) {
      case 'case_id':
        updateCase.caseId = snakeCase.case_id;
        break;

      case 'created_at':
        updateCase.createdAt = snakeCase.created_at;
        break;
      case 'created_by':
        if (snakeCase.created_by) {
          updateCase.createdBy = {
            username: snakeCase.created_by.username,
            fullName: snakeCase.created_by.full_name,
          };
        }
        break;
      case 'description':
        updateCase.description = snakeCase.description;
        break;
      case 'state':
        updateCase.state = snakeCase.state;
        break;
      case 'tags':
        updateCase.tags = snakeCase.tags;
        break;
      case 'title':
        updateCase.title = snakeCase.title;
        break;
      case 'updated_at':
        updateCase.updatedAt = snakeCase.updated_at;
        break;
      case 'version':
        updateCase.version = snakeCase.version;
        break;
      default:
        return null;
    }
  });
  return updateCase;
};
