#!/usr/bin/env bash

xvfb-run "$(FORCE_COLOR=0 yarn bin)/grunt" jenkins:report;
