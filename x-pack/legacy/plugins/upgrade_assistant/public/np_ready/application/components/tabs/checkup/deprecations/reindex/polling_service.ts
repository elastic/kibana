/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';

import { BehaviorSubject } from 'rxjs';

import { HttpSetup } from 'src/core/public';
import {
  IndexGroup,
  ReindexOperation,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../../../../../../common/types';
import { LoadingState } from '../../../../types';

const POLL_INTERVAL = 1000;

export interface ReindexState {
  loadingState: LoadingState;
  cancelLoadingState?: LoadingState;
  lastCompletedStep?: ReindexStep;
  status?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  reindexWarnings?: ReindexWarning[];
  hasRequiredPrivileges?: boolean;
  indexGroup?: IndexGroup;
}

interface StatusResponse {
  warnings?: ReindexWarning[];
  reindexOp?: ReindexOperation;
  hasRequiredPrivileges?: boolean;
  indexGroup?: IndexGroup;
}

/**
 * Service used by the frontend to start reindexing and get updates on the state of a reindex
 * operation. Exposes an Observable that can be used to subscribe to state updates.
 */
export class ReindexPollingService {
  public status$: BehaviorSubject<ReindexState>;
  private pollTimeout?: NodeJS.Timeout;
  private APIClient: AxiosInstance;

  constructor(private indexName: string, private xsrf: string, private http: HttpSetup) {
    this.status$ = new BehaviorSubject<ReindexState>({
      loadingState: LoadingState.Loading,
      errorMessage: null,
      reindexTaskPercComplete: null,
    });

    this.APIClient = axios.create({
      headers: {
        Accept: 'application/json',
        credentials: 'same-origin',
        'Content-Type': 'application/json',
        'kbn-version': this.xsrf,
        'kbn-xsrf': this.xsrf,
      },
    });
  }

  public updateStatus = async () => {
    // Prevent two loops from being started.
    this.stopPolling();

    try {
      const { data } = await this.APIClient.get<StatusResponse>(
        this.http.basePath.prepend(`/api/upgrade_assistant/reindex/${this.indexName}`)
      );
      this.updateWithResponse(data);

      // Only keep polling if it exists and is in progress.
      if (data.reindexOp && data.reindexOp.status === ReindexStatus.inProgress) {
        this.pollTimeout = setTimeout(this.updateStatus, POLL_INTERVAL);
      }
    } catch (e) {
      this.status$.next({
        ...this.status$.value,
        status: ReindexStatus.failed,
      });
    }
  };

  public stopPolling = () => {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
  };

  public startReindex = async () => {
    try {
      // Optimistically assume it will start, reset other state.
      const currentValue = this.status$.value;
      this.status$.next({
        ...currentValue,
        // Only reset last completed step if we aren't currently paused
        lastCompletedStep:
          currentValue.status === ReindexStatus.paused ? currentValue.lastCompletedStep : undefined,
        status: ReindexStatus.inProgress,
        reindexTaskPercComplete: null,
        errorMessage: null,
        cancelLoadingState: undefined,
      });
      const { data } = await this.APIClient.post<ReindexOperation>(
        this.http.basePath.prepend(`/api/upgrade_assistant/reindex/${this.indexName}`)
      );

      this.updateWithResponse({ reindexOp: data });
      this.updateStatus();
    } catch (e) {
      this.status$.next({ ...this.status$.value, status: ReindexStatus.failed });
    }
  };

  public cancelReindex = async () => {
    try {
      this.status$.next({
        ...this.status$.value,
        cancelLoadingState: LoadingState.Loading,
      });

      await this.APIClient.post(
        this.http.basePath.prepend(`/api/upgrade_assistant/reindex/${this.indexName}/cancel`)
      );
    } catch (e) {
      this.status$.next({
        ...this.status$.value,
        cancelLoadingState: LoadingState.Error,
      });
    }
  };

  private updateWithResponse = ({
    reindexOp,
    warnings,
    hasRequiredPrivileges,
    indexGroup,
  }: StatusResponse) => {
    const currentValue = this.status$.value;
    // Next value should always include the entire state, not just what changes.
    // We make a shallow copy as a starting new state.
    const nextValue = {
      ...currentValue,
      // If we're getting any updates, set to success.
      loadingState: LoadingState.Success,
    };

    if (warnings) {
      nextValue.reindexWarnings = warnings;
    }

    if (hasRequiredPrivileges !== undefined) {
      nextValue.hasRequiredPrivileges = hasRequiredPrivileges;
    }

    if (indexGroup) {
      nextValue.indexGroup = indexGroup;
    }

    if (reindexOp) {
      // Prevent the UI flickering back to inProgres after cancelling.
      nextValue.lastCompletedStep = reindexOp.lastCompletedStep;
      nextValue.status = reindexOp.status;
      nextValue.reindexTaskPercComplete = reindexOp.reindexTaskPercComplete;
      nextValue.errorMessage = reindexOp.errorMessage;

      if (reindexOp.status === ReindexStatus.cancelled) {
        nextValue.cancelLoadingState = LoadingState.Success;
      }
    }

    this.status$.next(nextValue);
  };
}
