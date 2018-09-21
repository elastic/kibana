#!/usr/bin/env bash

set -e

xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:report;
