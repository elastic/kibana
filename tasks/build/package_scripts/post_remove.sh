#!/bin/sh

user_check() {
  getent passwd "$1" > /dev/null 2>&1
}

user_remove() {
  userdel "$1"
}

case $1 in
    purge|0)
        if user_check "<%= user %>"  ; then
          user_remove "<%= user %>"
        fi
        ;;
esac
