#!/usr/bin/env bash

set -e

export TEST_BROWSER_HEADLESS=1

"$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:unit --dev;
